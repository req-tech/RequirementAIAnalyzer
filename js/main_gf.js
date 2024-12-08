let selArt_ref = [];
let inputExplanation = '';

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
    // check if the userKeysAllowed is set

    if (!userKeysAllowed) {
        document.getElementById('apiKeyInput').disabled = true;
        // Set the placeholder of the input field with id apiKeyInput to the message below
        setElementVisibility('saveCookie', 'none');
        setElementVisibility('removeCookie', 'none');
        document.getElementById('apiKeyInput').placeholder = 'User API keys are not allowed in this environment.';
    }
    adjustHeight();
}

// Function to show or hide HTML elements
function setElementVisibility(elementId, displayStyle) {
    const element = document.getElementById(elementId);
    if (element) {
        // console.log(`Toggling visibility of ${element.style.display} to ${displayStyle} for ${elementId}`);
        element.style.display = displayStyle;
        adjustHeight();
    } else {
        console.error(`${elementId} not found`);
    }
}

function setContainerText(containerId, string) {
    document.getElementById(containerId).textContent = string;
}

async function onBodyLoad() {
    // Load the language file
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
    setElementVisibility('updateButton', 'none');
    setElementVisibility('undoButton', 'block');
    adjustHeight();
}

// Reset the revised requirement field to the original requirement
async function undoUpdate() {
    if (!selArt_ref || selArt_ref.length !== 1) {
        alert('Select one artifact for analysis.');
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
    setElementVisibility('undoButton', 'none');
    setElementVisibility('updateButton', 'block');
    adjustHeight();
}


// Function to call the OpenAI API
// Function to call the OpenAI API
async function callOpenAIAPI(messages) {
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let apiKey = getApiKey();

    if (!apiKey) return;

    // Determine if the Azure API endpoint is defined
    if (typeof azureApiEndpoint !== 'undefined') {
        endpoint = azureApiEndpoint;
        console.log('Using Azure OpenAI.');
    } else {
        console.log('Using OpenAI.');
    }

    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        const bodyContent = {
            messages: messages,
            max_tokens: 2048,
            temperature: 0,
        };

        // Adjust headers and body for Azure API
        if (endpoint.includes('azure.com')) {
            headers['api-key'] = apiKey;
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
            bodyContent.model = 'gpt-4o-mini'; // Replace with 'gpt-4' if needed
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
            return 'Error analyzing the requirement.';
        }
    } catch (error) {
        let errorPrefix = 'Error calling OpenAI API:';
        if (endpoint.includes('azure.com')) {
            errorPrefix = 'Error calling Azure OpenAI API:';
        }
        console.error(errorPrefix, error);
        return 'Error analyzing the requirement.';
    }
}

// Function to analyze the requirement
async function analyzeRequirement(title, cleanText, promptType) {
    // System message containing the instructions and format requirements
    document.getElementById('aiResultText').textContent = "Analyzing requirement...";
    const systemMessage = {
        role: "system",
        content: `
Audience:
You are assisting a team of system engineers, requirements analysts, and stakeholders responsible for refining requirements in compliance with INCOSE standards. Your goal is to help them ensure that requirements are actionable, verifiable, and aligned with best practices of INCOSE.

Objective:
Analyze the given requirement for quality, identify deficiencies, and provide improvement intructions. If the requirement is high-quality, return it unchanged (with minor corrections for grammar or language if needed). The response should follow a structured, professional format.

Analysis Criteria, Evaluate the requirement based on these INCOSE characteristics: 
1. Unambiguous 
2. Verifiable 
3. Feasible 
4. Complete 
5. Correct 
6. Consistent 
7. Modifiable 

For each characteristic:
- Score it on a scale of 0–100.
- Identify any deficiencies with concrete examples.
- Suggest actionable improvements for deficiencies.

Thresholds
High Quality (final score ≥85%): Return the revised_requirement empty and state in explanation that 'No changes needed for this requirement.'
Low Quality (final score <85%): Revise the requirement to improve its quality and provide a detailed explanation of the deficiencies addressed.

Output Template
Follow this strict output format:

{
  "quality_score": "X%",
  "lacking_features": ["Feature1", "Feature2", "Feature3"],
  "instructions": "..."
}

Respond only with the JSON object according to the specified structure and no additional text.
        `,
    };

    // User message with the requirement
    const userMessage = {
        role: "user",
        content: `Input Requirement: '${cleanText}'`,
    };

    const messages = [systemMessage, userMessage];

    // Call the API
    const result = await callOpenAIAPI(messages);
    const resultJson = JSON.parse(result);
    // trim % sign from quality_score and convert to number
    const qualityScoreFloat = parseFloat(resultJson.quality_score.trim());

    if (qualityScoreFloat > 85) {
        // Return the result as is and add two elements to the JSON object
        // and return the JSON object as a string
        resultJson.revised_requirement = '';
        resultJson.revised_score = '';  //qualityScoreFloat + '%';
        return JSON.stringify(resultJson, null, 2);
    }

    // If quality_score is less than 85%, the revised_requirement should be generated
    document.getElementById('aiResultText').textContent = "Rewriting requirement...";
    
    const systemMessage2ndround = {
        role: "system",
        content: `
Audience:
You are assisting a team of system engineers, requirements analysts, and stakeholders responsible for refining requirements in compliance with INCOSE standards. Your goal is to help them ensure that requirements are actionable, verifiable, and aligned with best practices of INCOSE.

Objective:
Rewrite this requirement according to INCOSE standards and according to: ${inputExplanation}

Apply also these General INCOSE Analysis Criteria.
1. Unambiguous 
2. Verifiable 
3. Feasible 
4. Complete 
5. Correct 
6. Consistent 
7. Modifiable 

Give also a score for the revised requirement on a scale of 0-100.

Output Template
Follow this strict output format:

{
    "revised_requirement": "[revised requirement]",
    "revised_score": "Y%",
}

Respond only with the JSON object according to the specified structure and no additional text.
        `,
    };

    const messages2ndRound = [systemMessage2ndround, userMessage];

    const revisedResult = await callOpenAIAPI(messages2ndRound);
    console.log('Original Result:', result);
    console.log('Revised Result:', revisedResult);

    // Combine the json results into one json object
    let endResult = '';
    if (result && revisedResult) {
        endResult = `{${result},${revisedResult}}`;
    } else {
        // Raise an error if either result is missing
        console.error('Error combining the JSON results.');
    }

    const revisedResultJson = JSON.parse(revisedResult);

    // Combine both into one JSON object
    const combinedResult = {
        ...resultJson,
        ...revisedResultJson
    };

    console.log("End result:", JSON.stringify(combinedResult, null, 2));
    return  JSON.stringify(combinedResult, null, 2);
}

// Convert the returned JSON into formatted HTML
function jsonToHtml(jsonString) {
    let data;
    try {
        data = JSON.parse(jsonString);
    } catch (e) {
        console.error('Failed to parse JSON:', e);
        return '<p>Error parsing the AI response.</p>';
    }

    const { quality_score, lacking_features, instructions, revised_requirement, revised_score } = data;

    let html = `
        <div class="analysis-result">
            <strong>Quality Score (INCOSE Standard): ${quality_score}</strong>
            <strong>Revised Requirement:</strong>
            <p>${revised_requirement}</p>
            <strong>Revised Requirement Score: ${revised_score}</strong>
            <strong>Top 3 Lacking INCOSE Features:</strong>
            <ul>
                ${lacking_features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <strong>Explanation of Deficiency and Improvement:</strong>
            <p>${instructions}</p>
        </div>
    `;
    return html;
}

// Modify the readArtefact function to parse JSON and display HTML
async function readArtefact(promptType) {
    if (!selArt_ref || selArt_ref.length !== 1) {
        alert('Select one artifact for analysis.');
        return;
    }

    RM.Data.getAttributes(selArt_ref, [RM.Data.Attributes.PRIMARY_TEXT, RM.Data.Attributes.NAME], async function (res) {
        let primaryText = res.data[0].values["http://www.ibm.com/xmlns/rdm/types/PrimaryText"];
        let title = res.data[0].values["http://purl.org/dc/terms/title"];

        document.getElementById('aiResultText').textContent = "Processing...";
        setElementVisibility('undoButton', 'none');
        setElementVisibility('updateButton', 'none');
        adjustHeight();
        // Set the original requirement in the hidden input field for Undo
        document.getElementById('originalRequirement').value = primaryText;

        let result = await analyzeRequirement(title, primaryText, promptType);

        if (result) {
            // Convert JSON to HTML
            const htmlOutput = jsonToHtml(result);
            document.getElementById('aiResultText').innerHTML = htmlOutput;

            // Extract revised requirement from JSON
            let data;
            try {
                data = JSON.parse(result);
                const revisedReq = data.revised_requirement ? data.revised_requirement : '';
                document.getElementById('revisedRequirement').value = revisedReq;
            } catch (error) {
                console.error('Failed to parse JSON for revised requirement:', error);
            }
        } else {
            document.getElementById('aiResultText').textContent = "An error occurred while processing the requirement.";
        }
        setElementVisibility('updateButton', 'block');
        adjustHeight();
    });
}
