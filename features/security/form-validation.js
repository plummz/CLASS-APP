// Phase 2: Frontend Hardening — Form Validation & Data Safety
(function () {
  'use strict';

  var FOLDER_NAME_MAX = 50;
  var FILE_NAME_MAX = 100;
  var CHAT_MESSAGE_MAX = 2000;

  // Characters that break HTML/SQL or cause layout issues
  var UNSAFE_CHARS = /[<>"'`\\]/;

  /**
   * Validates a folder name before creation or rename.
   * Returns an error string if invalid, empty string if valid.
   */
  function validateFolderName(name) {
    var str = String(name || '').trim();
    if (!str) return 'Folder name cannot be empty.';
    if (str.length > FOLDER_NAME_MAX) return 'Folder name is too long (max ' + FOLDER_NAME_MAX + ' characters).';
    if (UNSAFE_CHARS.test(str)) return 'Folder name contains unsafe characters (no < > " \' ` \\).';
    return '';
  }

  /**
   * Validates a chat message before sending.
   * Returns an error string if invalid, empty string if valid.
   */
  function validateChatMessage(text) {
    if (!text) return '';
    if (text.length > CHAT_MESSAGE_MAX) return 'Message is too long (max ' + CHAT_MESSAGE_MAX + ' characters).';
    return '';
  }

  /**
   * Truncates text to maxLen, adding an ellipsis character if cut.
   * Safe to call before escapeHTML.
   */
  function truncateDisplay(text, maxLen) {
    var str = String(text != null ? text : '');
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
  }

  /**
   * Validates that an API response object has all required fields.
   * Returns true if valid, false otherwise (logs a warning).
   */
  function validateAPIResponse(data, requiredFields) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.warn('[form-validation] API response is not an object:', data);
      return false;
    }
    if (requiredFields) {
      for (var i = 0; i < requiredFields.length; i++) {
        if (!(requiredFields[i] in data)) {
          console.warn('[form-validation] API response missing field: ' + requiredFields[i], data);
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Safely coerces a value to string, using a fallback if null/undefined.
   */
  function safeString(val, fallback) {
    if (val === null || val === undefined) return fallback !== undefined ? fallback : '';
    return String(val);
  }

  /**
   * Safely coerces a value to array; returns [] if not an array.
   */
  function safeArray(val) {
    return Array.isArray(val) ? val : [];
  }

  /**
   * Safely coerces a value to plain object; returns {} if invalid.
   */
  function safeObject(val) {
    if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
    return val;
  }

  window.formValidation = {
    validateFolderName: validateFolderName,
    validateChatMessage: validateChatMessage,
    truncateDisplay: truncateDisplay,
    validateAPIResponse: validateAPIResponse,
    safeString: safeString,
    safeArray: safeArray,
    safeObject: safeObject,
    FOLDER_NAME_MAX: FOLDER_NAME_MAX,
    FILE_NAME_MAX: FILE_NAME_MAX,
    CHAT_MESSAGE_MAX: CHAT_MESSAGE_MAX,
  };
})();
