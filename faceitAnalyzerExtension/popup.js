document.addEventListener('DOMContentLoaded', () => {
    const analyzerForm = document.getElementById('analyzerForm');
    const analyzeAnotherButton = document.getElementById('analyzeAnother');
    const resultsBody = document.getElementById('resultsBody');
  
    if (!analyzerForm) {
      console.error('Error: Element with id="analyzerForm" not found');
      return;
    }
    if (!resultsBody) {
      console.error('Error: Element with id="resultsBody" not found');
      return;
    }
    if (!analyzeAnotherButton) {
      console.error('Error: Element with id="analyzeAnother" not found');
      return;
    }
  
    analyzerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
  
      const nickname = document.getElementById('nickname')?.value.trim();
      const matchUrl = document.getElementById('matchUrl')?.value.trim();
      const status = document.getElementById('status');
      const nicknameError = document.getElementById('nicknameError');
      const matchUrlError = document.getElementById('matchUrlError');
      const formContainer = document.querySelector('.form-container');
      const resultsContainer = document.querySelector('.results-container');
  
      if (!status || !nicknameError || !matchUrlError || !formContainer || !resultsContainer) {
        console.error('Error: One or more required elements not found');
        status.textContent = 'Error: UI initialization failed';
        return;
      }
  
      // Reset errors
      nicknameError.style.display = 'none';
      matchUrlError.style.display = 'none';
      status.textContent = 'Analyzing...';
      resultsBody.innerHTML = '';
  
      // Validate inputs
      let hasError = false;
      if (!nickname) {
        nicknameError.textContent = 'Nickname is required';
        nicknameError.style.display = 'block';
        hasError = true;
      }
      if (!matchUrl || !matchUrl.includes('/cs2/room/')) {
        matchUrlError.textContent = 'Invalid match URL';
        matchUrlError.style.display = 'block';
        hasError = true;
      }
      if (hasError) {
        status.textContent = 'Please fix errors';
        return;
      }
  
      try {
        // Send message to background script
        const response = await chrome.runtime.sendMessage({
          action: 'analyzeMatch',
          nickname,
          matchUrl
        });
  
        if (response.error) {
          status.textContent = `Error: ${response.error}`;
          return;
        }
  
        // Animate: Hide form, show results
        formContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
  
        // Populate table
        status.textContent = 'Analysis Complete';
        for (const [map, probability] of Object.entries(response.winProbabilities)) {
          const probValue = parseFloat(probability);
          const color = probValue < 50 ? '#FF4444' : probValue > 50 ? '#00FF00' : '#FFFFFF';
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${map}</td>
            <td>
              ${probability}
              <svg width="20" height="10" style="vertical-align: middle; margin-left: 8px;">
                <line x1="0" y1="5" x2="20" y2="5" stroke="${color}" stroke-width="2"/>
              </svg>
            </td>
          `;
          resultsBody.appendChild(row);
        }
      } catch (error) {
        status.textContent = `Error: ${error.message}`;
      }
    });
  
    analyzeAnotherButton.addEventListener('click', () => {
      const formContainer = document.querySelector('.form-container');
      const resultsContainer = document.querySelector('.results-container');
      const status = document.getElementById('status');
      const nickname = document.getElementById('nickname');
      const matchUrl = document.getElementById('matchUrl');
  
      if (!formContainer || !resultsContainer || !status || !nickname || !matchUrl) {
        console.error('Error: One or more required elements not found for reset');
        return;
      }
  
      // Animate: Hide results, show form
      resultsContainer.classList.add('hidden');
      formContainer.classList.remove('hidden');
  
      // Reset state
      status.textContent = 'Ready';
      resultsBody.innerHTML = '';
      nickname.value = '';
      matchUrl.value = '';
    });
  });