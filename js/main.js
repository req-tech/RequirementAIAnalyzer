let selArt_ref = [];

RM.Event.subscribe(RM.Event.ARTIFACT_SELECTED, onSelection); // Use the RM library to deal with DNG

function onSelection(artifacts) {
    selArt_ref = artifacts;
}

function adjustHeight() { // to recall each time we update the UI
    gadgets.window.adjustHeight();
}

function toggleElementVisibility(elementId, buttonId, displayStrings) {
    let element = document.getElementById(elementId);
    let button = document.getElementById(buttonId);

    if (element.style.display == 'none') {
        element.style.display = "block";
        button.innerHTML = displayStrings[0];
    } else {
        element.style.display = "none";
        button.innerHTML = displayStrings[1];
    }

}

function show_instructions() {
    toggleElementVisibility('instructions_div', 'instructions_button', [getLangString('cs001'), getLangString('cs002')]);
    adjustHeight();
}

function show_settings() {
    toggleElementVisibility('settings_div', 'settings_button', [getLangString('cs003'), getLangString('cs004')]);
    // if variable userKeysAllowed is set to false, disable the input field with id apiKeyInput
    if (!userKeysAllowed) {
        document.getElementById('apiKeyInput').disabled = true;
        // Set the placeholder of the input field with id apiKeyInput to the message below
        document.getElementById('apiKeyInput').placeholder = 'User API keys are not allowed.';
    }
    adjustHeight();
}

function setContainerText(containerId, string) {
    document.getElementById(containerId).textContent = string;
}

async function onBodyLoad() {

    const message = document.createElement('h3');
    document.body.appendChild(message);

    const resultText = document.createElement('div');
    resultText.id = 'aiResultText';
    resultText.textContent = "This is where the AI results will be displayed.";
    resultText.style.fontSize = '12px'; // Set the text size to 12px
    document.body.appendChild(resultText);

    loadLanguage(); // load the text according to the language file set in main.xml
    adjustHeight();
}


// Function to load JSON file
async function loadPrompts() {
    const response = await fetch('js/prompts.json');
    const prompts = await response.json();
    return prompts;
}

// Function to get the prompt
async function getPrompt(cleanText, promptType) {
    const prompts = await loadPrompts();
    const template = prompts[promptType];
    
    if (template) {
        return template.replace('${cleanText}', cleanText);
    }
    return '';
}

async function callOpenAIAPI(title, cleanText, promptType) {
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let apiKey = getApiKey();

    if (!apiKey) return;

    const prompt = await getPrompt(cleanText, promptType);
    // console.log(prompt);

    // Determine if the Azure API endpoint is defined and use it if available
    if (typeof azureApiEndpoint !== 'undefined') {
        endpoint = azureApiEndpoint;
        console.log('Using Azure OpenAI.');
    } else {
        console.log('Using OpenAI.');
    }

    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        const bodyContent = {
            messages: [
                { role: 'system', content: 'You are an expert in requirement analysis and test generation.' },
                { role: 'user', content: prompt },
                { role: 'user', content: "Requirement Title: " + title + " PrimaryText: " + cleanText }
            ],
            max_tokens: 1000
        };

        // Adjust headers and body for Azure API
        if (endpoint.includes('azure.com')) {
            headers['api-key'] = apiKey;
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
            bodyContent.model = 'gpt-4o-mini';
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bodyContent),
        });

        const data = await response.json();
        if (data && data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            console.error('Unexpected API response format:', data);
            // return 'Error analyzing the requirement.';
        }
    } catch (error) {
        let errorPrefix = 'Error calling OpenAI API:';
        // if endpoint contain 'azure.com' then it is Azure OpenAI
        if ( endpoint.includes('azure.com') ) {
            errorPrefix = 'Error calling Azure OpenAI API:';
        }
        console.error('Error calling OpenAI API:', error);
        return 'Error analyzing the requirement.';

    }
}

function getApiKey() {
    if (apiKey === 'undefined') {
        env = { apiKey: "" };
    }

    let OpenAIapiKey = "";
    // Check if the API key is set in the server environment and the value is not 'unset'
    if (apiKey && apiKey !== 'unset') {
        OpenAIapiKey = apiKey;
        console.log('Using API key from server.');
    } else {
        const apiKeyEntry = document.cookie.split('; ').find(row => row.startsWith('apiKey='));
        if (apiKeyEntry) {
            const apiKeyValue = apiKeyEntry.split('=')[1].split('|')[0]; // Extract only the API key part
            OpenAIapiKey = apiKeyValue;
            console.log('Using API key from cookie.');
            // console.log('API key:', OpenAIapiKey);
        } else {
            console.log('API key not found in cookie.');
        }
    }
    // Option to read from input field
    if (!OpenAIapiKey) {
        let fieldApiKey = document.getElementById('apiKeyInput').value; 
        
        if (fieldApiKey) {
            OpenAIapiKey = fieldApiKey;
            console.log('Using API key from Field.');
        }
    }

    if (!OpenAIapiKey) {
        alert('Please enter your OpenAI API key at settings or ask your Admin to add it on server.');
        return;
    }
    return OpenAIapiKey;
}

function saveApiKeyAsCookie() {
    const apiKey = document.getElementById('apiKeyInput').value;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 365); // Set cookie to expire in 365 days
    document.cookie = `apiKey=${apiKey}|${expirationDate.toUTCString()}; path=/;`;

    if (checkCookieExists('apiKey')) {
        console.log('API key cookie has been successfully stored.');
    } else {
        console.log('Failed to store API key cookie.');
    }
}

function removeApiKeyCookie() {
    const message = 'API key cookie has been removed.';
    document.cookie = 'apiKey=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    console.log(message);

    // Update the placeholder of the input field with the name 'apiKeyInput'
    const apiKeyInput = document.getElementById('apiKeyInput');
    if (apiKeyInput) {
        apiKeyInput.placeholder = message;
    }
}

function checkCookieExists(cookieName) {
    const cookie = document.cookie.split('; ').find(row => row.startsWith(cookieName + '='));
    if (cookie) {
        const cookieValue = cookie.split('=')[1];
        const [value, expires] = cookieValue.split('|');
        if (expires) {
            const expirationDate = new Date(expires);
            if (expirationDate > new Date()) {
                return true;
            } else {
                // Cookie is expired, remove it
                document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
                return false;
            }
        } else {
            // No expiration date, assume cookie is valid
            return true;
        }
    }
    return false;
}

// New function to update the artifact
// Function to update the artifact with the revised requirement
async function updateArtifact() {
    if (!selArt_ref || selArt_ref.length === 0) {
        alert('No text artifacts selected.');
        return;
    }

    const revisedRequirement = document.getElementById('revisedRequirement').value;
    if (!revisedRequirement) {
        alert('Revised Requirement is empty.');
        return;
    }

    try {
        // Create an instance of RM.ArtifactAttributes
        let artifactAttributes = new RM.ArtifactAttributes();
        let attributeValues = new RM.AttributeValues();

        // Set the artifact reference
        artifactAttributes.ref = selArt_ref[0];

        // Set the attribute values (in this case, Primary Text)
        attributeValues["http://www.ibm.com/xmlns/rdm/types/PrimaryText"] = revisedRequirement;
        artifactAttributes.values = attributeValues;

        // Set attributes using the new format
        await RM.Data.setAttributes(artifactAttributes, function (result) {
            if (result.code === RM.OperationResult.OPERATION_OK) {
                console.log('Artifact updated successfully.');
            } else {
                console.error('Failed to update artifact:', result);
                alert('Failed to update artifact. Do you have required permission and license?.');
            }
        });
    } catch (error) {
        console.error('An error occurred while updating the artifact:', error);
    }
}



// Modify the readArtefact function to set the revised requirement in the hidden input field
async function readArtefact(promptType) {
    if (!selArt_ref || selArt_ref.length === 0) {
        alert('No text artifacts selected.');
        return;
    }

    RM.Data.getAttributes(selArt_ref, [RM.Data.Attributes.PRIMARY_TEXT, RM.Data.Attributes.NAME], async function (res) {
        let primaryText = res.data[0].values["http://www.ibm.com/xmlns/rdm/types/PrimaryText"];
        let title = res.data[0].values["http://purl.org/dc/terms/title"];

        document.getElementById('aiResultText').textContent = "Processing...";
        // Set the original requirement in the hidden input field for Undo
        document.getElementById('originalRequirement').value = primaryText;

        let result = await callOpenAIAPI(title, primaryText, promptType);
        let formattedResult = '';
        let plainResult = '';
        if (result) {
            formattedResult = result.replaceAll('¤**', '<br><strong>');
            plainResult = formattedResult.replaceAll('¤**', '');
            formattedResult = formattedResult.replaceAll('**', '</strong>');
            plainResult = plainResult.replaceAll('**', '');
            formattedResult = formattedResult.replaceAll('¤-', '<br>-');
            plainResult = plainResult.replaceAll('¤-', '');

            document.getElementById('aiResultText').innerHTML = formattedResult;
        } else {
            document.getElementById('aiResultText').textContent = "An error occurred while processing the requirement.";
        }

        const match = plainResult.match(/Revised Requirement:\s*([\s\S]*?)\s*Revised Requirement Score:/i);

        if (match && match[1]) {
            const revisedRequirement = match[1].trim().replace(/<\/?[^>]+(>|$)/g, "");
            document.getElementById('revisedRequirement').value = revisedRequirement;
        } 
        else {
            console.error('Revised Requirement not found');
        }

        adjustHeight();
    });
}
// Undo the update
async function undoUpdate() {
    if (!selArt_ref || selArt_ref.length === 0) {
        alert('No text artifacts selected.');
        return;
    }

    const originalRequirement = document.getElementById('originalRequirement').value;
    if (!originalRequirement) {
        alert('No original value to revert to.');
        return;
    }

    try {
        // Create an instance of RM.ArtifactAttributes
        let artifactAttributes = new RM.ArtifactAttributes();
        let attributeValues = new RM.AttributeValues();

        // Set the artifact reference
        artifactAttributes.ref = selArt_ref[0];

        // Set the original attribute value
        attributeValues["http://www.ibm.com/xmlns/rdm/types/PrimaryText"] = originalRequirement;
        artifactAttributes.values = attributeValues;

        // Set attributes using the new format
        await RM.Data.setAttributes(artifactAttributes, function (result) {
            if (result.code === RM.OperationResult.OPERATION_OK) {
                console.log('Artifact reverted successfully.');
            } else {
                console.error('Failed to revert artifact:', result);
                alert('Failed to revert artifact. Please check the console for more details.');
            }
        });
    } catch (error) {
        console.error('An error occurred while reverting the artifact:', error);
    }
}

