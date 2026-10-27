/**
 * ============================================================================
 * CODEVAULT NETWORK SYNC BRIDGE & PERSISTENCE ENGINE
 * - Automatic session snapshotting to SESSION_[USN].json (power-loss recovery)
 * - Compression & packaging of FINAL_[USN].json payload
 * - LAN HTTP POST sync bridge to /api/contest/sync-submission
 * - Offline queueing & automatic retry on network recovery
 * ============================================================================
 */

class NetworkSyncBridge {
  constructor() {
    this.hostUrl = 'http://localhost:4500';
    this.pendingSyncList = [];
    this.isOnline = navigator.onLine;

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[Sync Bridge]: Network connection restored. Initiating recovery sync...');
      this.syncPendingSubmissions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.warn('[Sync Bridge]: Network offline. Operating in pure isolated mode.');
    });
  }

  setHostUrl(url) {
    if (url) {
      this.hostUrl = url.trim().replace(/\/+$/, '');
    }
  }

  /**
   * Persists relative execution snapshots to SESSION_[USN].json
   */
  async saveSessionSnapshot(sessionData) {
    if (!window.api || !window.api.saveSessionSnapshot) return;
    try {
      await window.api.saveSessionSnapshot({
        usn: sessionData.usn,
        name: sessionData.name,
        contestId: sessionData.contestId,
        timeElapsedSeconds: sessionData.timeElapsedSeconds,
        currentProblemIndex: sessionData.currentProblemIndex,
        problemCodes: sessionData.problemCodes,
        problemEvaluations: sessionData.problemEvaluations,
        violations: sessionData.violations,
        savedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Session Snapshot Failed]:', err);
    }
  }

  /**
   * Check if a previous crashed session exists for this USN to restore state
   */
  async loadSessionSnapshot(usn) {
    if (!window.api || !window.api.loadSessionSnapshot) return null;
    try {
      const res = await window.api.loadSessionSnapshot({ usn });
      if (res.success && res.found) {
        return res.data;
      }
    } catch (err) {
      console.error('[Load Session Failed]:', err);
    }
    return null;
  }

  /**
   * Saves FINAL_[USN].json to disk and syncs via HTTP POST to the Host Server
   */
  async submitFinalPayload(finalPayload) {
    // Step 1: Save local immutable JSON file to disk
    let localSaveResult = { success: false };
    if (window.api && window.api.saveFinalSubmission) {
      localSaveResult = await window.api.saveFinalSubmission(finalPayload);
    }

    // Step 2: Attempt HTTP POST Sync to Host Server
    let syncResult = { success: false, status: 'offline', error: 'Offline mode' };
    if (window.api && window.api.pushSubmissionHttp) {
      try {
        const httpRes = await window.api.pushSubmissionHttp({
          hostUrl: this.hostUrl,
          payload: finalPayload
        });

        if (httpRes.success) {
          syncResult = {
            success: true,
            status: 'synced',
            message: httpRes.response?.message || 'Synced successfully to Host Leaderboard.',
            receivedAt: httpRes.response?.receivedAt
          };
        } else {
          syncResult = {
            success: false,
            status: 'pending',
            error: httpRes.error || 'Host server unreachable.'
          };
        }
      } catch (err) {
        syncResult = {
          success: false,
          status: 'pending',
          error: err.message
        };
      }
    }

    return {
      localSaved: localSaveResult.success,
      filename: localSaveResult.filename || `FINAL_${finalPayload.usn}.json`,
      filePath: localSaveResult.filePath,
      sync: syncResult
    };
  }

  /**
   * Scans local pending submissions and pushes them over HTTP
   */
  async syncPendingSubmissions() {
    if (!window.api || !window.api.getPendingSubmissions) return { synced: 0, failed: 0 };

    const listRes = await window.api.getPendingSubmissions();
    if (!listRes.success || !listRes.submissions || listRes.submissions.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const item of listRes.submissions) {
      try {
        // Fetch full submission data
        const loadRes = await window.api.loadSessionSnapshot({ usn: item.usn });
        if (loadRes.data) {
          const pushRes = await window.api.pushSubmissionHttp({
            hostUrl: this.hostUrl,
            payload: loadRes.data
          });
          if (pushRes.success) {
            synced++;
          } else {
            failed++;
          }
        }
      } catch (_) {
        failed++;
      }
    }

    return { synced, failed };
  }
}

window.syncBridge = new NetworkSyncBridge();
