(function () {
  // Guardrails for when Supabase config/client isn't ready.
  // Goal: prevent uncaught exceptions from breaking global click wiring.

  function supabaseReady() {
    return Boolean(window.sb);
  }

  function notifyUnavailable(label) {
    try {
      if (typeof window.customAlert === 'function') {
        window.customAlert(label + ' is unavailable right now. Please wait a moment and try again.');
      } else if (typeof window.showToast === 'function') {
        window.showToast(label + ' is unavailable right now. Please try again.', 'error');
      } else {
        alert(label + ' is unavailable right now. Please try again.');
      }
    } catch (_) {
      // last resort
    }
  }

  function wrap(name, label) {
    var fn = window[name];
    if (typeof fn !== 'function') return;
    if (fn.__supabaseGuardWrapped) return;

    function guarded() {
      if (!supabaseReady()) {
        console.warn('[hotfix] Blocked action (sb not ready):', name);
        notifyUnavailable(label);
        return;
      }
      return fn.apply(this, arguments);
    }

    guarded.__supabaseGuardWrapped = true;
    window[name] = guarded;
  }

  // Folder / file explorer actions (high-frequency click paths)
  wrap('openFolderExplorer', 'Folders');
  wrap('openFileExplorer', 'Files');

  wrap('createFolderAPI', 'Create folder');
  wrap('renameFolderAPI', 'Rename folder');
  wrap('deleteFolderAPI', 'Delete folder');

  wrap('createSubFolderAPI', 'Create sub-folder');
  wrap('deleteSubFolderAPI', 'Delete sub-folder');

  wrap('uploadFileToFolderAPI', 'Upload');
  wrap('deleteFileAPI', 'Delete');

  wrap('copyFileToFolder', 'Copy/Move');
  wrap('moveFileToFolder', 'Copy/Move');
})();
