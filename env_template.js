// Set the OpenAI API or Azure OpenAI API key here
const apiKey = 'sk.........';

// Set Azure OpenAI endpoint here. For OpenAI leave this empty
// eg.: https://acmeai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview
// Get these from: Azure OpenAI Studio -> Deployments -> Your Deployment -> API -> Endpoint Target URI
const azureApiEndpoint = 'https://[yourResourceName].openai.azure.com/openai/deployments/[yourDeploymentName]/chat/completions?api-version=[yourApiVersion]';

// Set to false to deny users to use their own API keys in settings
const userKeysAllowed = false; 