// Popup script for settings

document.addEventListener('DOMContentLoaded', async () => {
  const hostInput = document.getElementById('sonarrHost');
  const apiKeyInput = document.getElementById('sonarrApiKey');
  const fetchSonarrButton = document.getElementById('fetchSonarrConfig');
  const profileSelect = document.getElementById('qualityProfileId');
  const folderSelect = document.getElementById('rootFolderPath');
  const saveButton = document.getElementById('save');
  const clearButton = document.getElementById('clear');

  let sonarrConfigurationLoaded = false;
  let loadedConfig = { host: '', apiKey: '' }; // Track what config was used for loading

  // Load existing settings
  const settings = await chrome.storage.local.get(['sonarrHost', 'sonarrApiKey', 'qualityProfileId', 'rootFolderPath']);
  hostInput.value = settings.sonarrHost || '';
  apiKeyInput.value = settings.sonarrApiKey || '';

  // Store initial values to track changes (start with current form state)
  const initialValues = {
    sonarrHost: hostInput.value,
    sonarrApiKey: apiKeyInput.value,
    qualityProfileId: profileSelect.value,
    rootFolderPath: folderSelect.value
  };

  // Function to check if save button should be enabled
  function checkSaveButtonState() {
    const currentValues = {
      sonarrHost: hostInput.value.trim(),
      sonarrApiKey: apiKeyInput.value.trim(),
      qualityProfileId: profileSelect.value,
      rootFolderPath: folderSelect.value
    };

    // Check if all required fields are filled
    const allFieldsFilled = currentValues.sonarrHost &&
                           currentValues.sonarrApiKey &&
                           currentValues.qualityProfileId &&
                           currentValues.rootFolderPath;

    // Check if any field has changed from initial values
    const hasChanged = Object.keys(initialValues).some(key =>
      currentValues[key] !== initialValues[key]
    );

    // Enable save button only if all fields are filled AND there are changes
    saveButton.disabled = !(allFieldsFilled && hasChanged);
  }

  // Function to check if fetch button should be enabled
  function checkFetchButtonState() {
    const currentHost = hostInput.value.trim();
    const currentApiKey = apiKeyInput.value.trim();
    const hasHost = currentHost !== '';
    const hasApiKey = currentApiKey !== '';

    // If current values match the loaded config, restore loaded state
    if (loadedConfig.host && loadedConfig.apiKey && loadedConfig.host === currentHost && loadedConfig.apiKey === currentApiKey) {
      sonarrConfigurationLoaded = true;
      fetchSonarrButton.textContent = 'Configuration Loaded';
      fetchSonarrButton.disabled = true;
      return;
    }

    // If configuration was loaded but current values are different, show "Fetch Configuration"
    if (sonarrConfigurationLoaded && hasHost && hasApiKey) {
      fetchSonarrButton.textContent = 'Fetch Configuration';
      fetchSonarrButton.disabled = false;
      return;
    }

    // Default logic: enable only if both fields are populated
    const canFetch = hasHost && hasApiKey;
    fetchSonarrButton.disabled = !canFetch;
    fetchSonarrButton.textContent = 'Fetch Configuration';
  }

  // Function to clear error messages
  function clearErrorMessages() {
    const existingMessages = document.querySelectorAll('.status-message.status-error');
    existingMessages.forEach(msg => msg.remove());
  }

  // Add change listeners to all form fields
  hostInput.addEventListener('input', () => {
    clearErrorMessages();
    saveIncrementalSettings();
    checkSaveButtonState();
    checkFetchButtonState();
  });

  apiKeyInput.addEventListener('input', () => {
    clearErrorMessages();
    saveIncrementalSettings();
    checkSaveButtonState();
    checkFetchButtonState();
  });

  profileSelect.addEventListener('change', checkSaveButtonState);
  folderSelect.addEventListener('change', checkSaveButtonState);

  // If we have saved settings, try to fetch configuration automatically
  if (settings.sonarrHost && settings.sonarrApiKey) {
    fetchSonarrConfiguration();
  }

  // Check for changes and button states initially
  checkSaveButtonState();
  checkFetchButtonState();

  // Check permission status on current tab
  checkPermissionStatus();

  async function checkPermissionStatus() {
    const statusEl = document.getElementById('permissionStatus');
    const supportedPatterns = [
      /imdb\.com\/title\//,
      /themoviedb\.org\/tv\//,
      /thetvdb\.com\/series\//,
      /rottentomatoes\.com\/tv\//,
    ];

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (!tab || !tab.url) return;

      const isSupportedPage = supportedPatterns.some(p => p.test(tab.url));
      if (!isSupportedPage) return;

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        if (response && response.active) {
          statusEl.textContent = 'Extension is active on this page';
          statusEl.className = 'status-active';
        }
      } catch {
        statusEl.textContent = 'Extension needs permission for this website. Enable in Safari \u2192 Settings \u2192 Extensions \u2192 Sonarr \u2192 Website Access';
        statusEl.className = 'status-no-permission';
      }
    } catch {
      // Ignore — can't query tabs (e.g. popup opened from toolbar on new tab)
    }
  }

  // Incremental saving functions
  async function saveIncrementalSettings() {
    const host = hostInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    // Only save if we have at least one field filled
    if (host || apiKey) {
      try {
        await chrome.storage.local.set({
          sonarrHost: host,
          sonarrApiKey: apiKey
        });
      } catch (error) {
        console.warn('Failed to save incremental settings:', error);
      }
    }
  }

  // Clear configuration
  clearButton.addEventListener('click', async () => {
    clearButton.textContent = 'Clearing...';
    clearButton.disabled = true;

    try {
      await chrome.storage.local.clear();

      // Reset form
      hostInput.value = '';
      apiKeyInput.value = '';
      profileSelect.innerHTML = '<option value="">Select a profile...</option>';
      folderSelect.innerHTML = '<option value="">Select a folder...</option>';
      profileSelect.disabled = true;
      folderSelect.disabled = true;
      saveButton.disabled = true;

      // Reset configuration state
      sonarrConfigurationLoaded = false;
      loadedConfig = { host: '', apiKey: '' };

      // Update button states after clearing
      checkFetchButtonState();
    } catch (error) {
      console.warn('Failed to clear configuration:', error);
    } finally {
      clearButton.textContent = 'Clear Configuration';
      clearButton.disabled = false;
    }
  });

  function showStatusMessage(message, type) {
    // Remove existing status messages
    const existingMessages = document.querySelectorAll('.status-message');
    existingMessages.forEach(msg => msg.remove());

    // Create new status message
    const statusDiv = document.createElement('div');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;

    // Insert after the button group
    const buttonGroup = document.querySelector('.button-group');
    buttonGroup.parentNode.insertBefore(statusDiv, buttonGroup.nextSibling);

    // Auto-hide after 3 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        if (statusDiv.parentNode) {
          statusDiv.remove();
        }
      }, 3000);
    }
  }

  // Fetch configuration button
  fetchSonarrButton.addEventListener('click', fetchSonarrConfiguration);

  // Save settings
  saveButton.addEventListener('click', async () => {
    const selectedProfile = profileSelect.value;
    const selectedFolder = folderSelect.value;

    if (!selectedProfile || !selectedFolder) {
      showStatusMessage('Please select a quality profile and root folder.', 'error');
      return;
    }

    saveButton.textContent = 'Saving...';
    saveButton.disabled = true;

    try {
      const newSettings = {
        sonarrHost: hostInput.value.trim(),
        sonarrApiKey: apiKeyInput.value.trim(),
        qualityProfileId: parseInt(selectedProfile),
        rootFolderPath: selectedFolder
      };

      await chrome.storage.local.set(newSettings);

      // Update initial values to reflect saved state
      initialValues.sonarrHost = hostInput.value;
      initialValues.sonarrApiKey = apiKeyInput.value;
      initialValues.qualityProfileId = profileSelect.value;
      initialValues.rootFolderPath = folderSelect.value;

      showStatusMessage('Settings saved successfully!', 'success');
      setTimeout(() => window.close(), 1500);
    } catch (error) {
      showStatusMessage('Failed to save settings.', 'error');
      saveButton.textContent = 'Save Settings';
      saveButton.disabled = false;
    }
  });

  async function fetchSonarrConfiguration() {
    const host = hostInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!host || !apiKey) {
      showStatusMessage('Please enter both Sonarr Host and API Key first.', 'error');
      return;
    }

    fetchSonarrButton.textContent = 'Fetching...';
    fetchSonarrButton.disabled = true;

    // Reset select fields to default state
    profileSelect.value = '';
    folderSelect.value = '';
    profileSelect.disabled = true;
    folderSelect.disabled = true;

    try {
      // Fetch quality profiles
      const profilesResponse = await fetch(`${host}/api/v3/qualityprofile`, {
        headers: { 'X-Api-Key': apiKey }
      });

      if (!profilesResponse.ok) {
        throw new Error(`Failed to fetch quality profiles: ${profilesResponse.status}`);
      }

      const profiles = await profilesResponse.json();

      // Populate quality profile select
      profileSelect.innerHTML = '<option value="">Select a profile...</option>';
      profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        if (settings.qualityProfileId == profile.id) {
          option.selected = true;
        }
        profileSelect.appendChild(option);
      });

      // Fetch root folders
      const foldersResponse = await fetch(`${host}/api/v3/rootfolder`, {
        headers: { 'X-Api-Key': apiKey }
      });

      if (!foldersResponse.ok) {
        throw new Error(`Failed to fetch root folders: ${foldersResponse.status}`);
      }

      const folders = await foldersResponse.json();

      // Populate root folder select
      folderSelect.innerHTML = '<option value="">Select a folder...</option>';
      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.path;
        option.textContent = folder.path;
        if (settings.rootFolderPath === folder.path) {
          option.selected = true;
        }
        folderSelect.appendChild(option);
      });

      // Enable selects
      profileSelect.disabled = false;
      folderSelect.disabled = false;

      // Update initial values to match loaded configuration
      initialValues.qualityProfileId = profileSelect.value;
      initialValues.rootFolderPath = folderSelect.value;

      // Check for changes (should disable save button since values match initial)
      checkSaveButtonState();

      // Store what config was used for loading
      loadedConfig.host = host;
      loadedConfig.apiKey = apiKey;

      // Mark configuration as loaded
      sonarrConfigurationLoaded = true;

      // Update button state (will show "Configuration Loaded")
      checkFetchButtonState();

    } catch (error) {
      showStatusMessage('Error fetching Sonarr configuration: ' + error.message, 'error');
      fetchSonarrButton.textContent = 'Fetch Configuration';
      fetchSonarrButton.disabled = false;
    }
  }
});
