Groq API Reference
Copy page

Chat
Create chat completion
POST
https://api.groq.com/openai/v1/chat/completions

Creates a model response for the given chat conversation.

Request Body
messages
array
Required
A list of messages comprising the conversation so far.

Show possible types
model
string
Required
ID of the model to use. For details on which models are compatible with the Chat API, see available models

citation_options
string or null
Optional
Defaults to enabled
Allowed values: enabled, disabled
Whether to enable citations in the response. When enabled, the model will include citations for information retrieved from provided documents or web searches.

compound_custom
object or null
Optional
Custom configuration of models and tools for Compound.

Show properties
disable_tool_validation
boolean
Optional
Defaults to false
If set to true, groq will return called tools without validating that the tool is present in request.tools. tool_choice=required/none will still be enforced, but the request cannot require a specific tool be used.

documents
array or null
Optional
A list of documents to provide context for the conversation. Each document contains text that can be referenced by the model.

Show properties
exclude_domains
Deprecated
array or null
Optional
Deprecated: Use search_settings.exclude_domains instead. A list of domains to exclude from the search results when the model uses a web search tool.

frequency_penalty
number or null
Optional
Defaults to 0
Range: -2 - 2
This is not yet supported by any of our models. Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.

function_call
Deprecated
string / object or null
Optional
Deprecated in favor of tool_choice.

Controls which (if any) function is called by the model. none means the model will not call a function and instead generates a message. auto means the model can pick between generating a message or calling a function. Specifying a particular function via {"name": "my_function"} forces the model to call that function.

none is the default when no functions are present. auto is the default if functions are present.

Show possible types
functions
Deprecated
array or null
Optional
Deprecated in favor of tools.

A list of functions the model may generate JSON inputs for.

Show properties
include_domains
Deprecated
array or null
Optional
Deprecated: Use search_settings.include_domains instead. A list of domains to include in the search results when the model uses a web search tool.

include_reasoning
boolean or null
Optional
Whether to include reasoning in the response. If true, the response will include a reasoning field. If false, the model's reasoning will not be included in the response. This field is mutually exclusive with reasoning_format.

logit_bias
object or null
Optional
This is not yet supported by any of our models. Modify the likelihood of specified tokens appearing in the completion.

logprobs
boolean or null
Optional
Defaults to false
This is not yet supported by any of our models. Whether to return log probabilities of the output tokens or not. If true, returns the log probabilities of each output token returned in the content of message.

max_completion_tokens
integer or null
Optional
The maximum number of tokens that can be generated in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length.

max_tokens
Deprecated
integer or null
Optional
Deprecated in favor of max_completion_tokens. The maximum number of tokens that can be generated in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length.

metadata
object or null
Optional
This parameter is not currently supported.

n
integer or null
Optional
Defaults to 1
Range: 1 - 1
How many chat completion choices to generate for each input message. Note that the current moment, only n=1 is supported. Other values will result in a 400 response.

parallel_tool_calls
boolean or null
Optional
Defaults to true
Whether to enable parallel function calling during tool use.

presence_penalty
number or null
Optional
Defaults to 0
Range: -2 - 2
This is not yet supported by any of our models. Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.

reasoning_effort
string or null
Optional
Allowed values: none, default, low, medium, high
qwen3 models support the following values Set to 'none' to disable reasoning. Set to 'default' or null to let Qwen reason.

openai/gpt-oss-20b and openai/gpt-oss-120b support 'low', 'medium', or 'high'. 'medium' is the default value.

reasoning_format
string or null
Optional
Allowed values: hidden, raw, parsed
Specifies how to output reasoning tokens This field is mutually exclusive with include_reasoning.

response_format
object / object / object or null
Optional
An object specifying the format that the model must output. Setting to { "type": "json_schema", "json_schema": {...} } enables Structured Outputs which ensures the model will match your supplied JSON schema. json_schema response format is only available on supported models. Setting to { "type": "json_object" } enables the older JSON mode, which ensures the message the model generates is valid JSON. Using json_schema is preferred for models that support it.

Show possible types
search_settings
object or null
Optional
Settings for web search functionality when the model uses a web search tool.

Show properties
seed
integer or null
Optional
If specified, our system will make a best effort to sample deterministically, such that repeated requests with the same seed and parameters should return the same result. Determinism is not guaranteed, and you should refer to the system_fingerprint response parameter to monitor changes in the backend.

service_tier
string or null
Optional
Allowed values: auto, on_demand, flex, performance, null
The service tier to use for the request. Defaults to on_demand.

auto will automatically select the highest tier available within the rate limits of your organization.
flex uses the flex tier, which will succeed or fail quickly.
stop
string / array or null
Optional
Up to 4 sequences where the API will stop generating further tokens. The returned text will not contain the stop sequence.

Show possible types
store
boolean or null
Optional
This parameter is not currently supported.

stream
boolean or null
Optional
Defaults to false
If set, partial message deltas will be sent. Tokens will be sent as data-only server-sent events as they become available, with the stream terminated by a data: [DONE] message. Example code.

stream_options
object or null
Optional
Options for streaming response. Only set this when you set stream: true.

Show properties
temperature
number or null
Optional
Defaults to 1
Range: 0 - 2
What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. We generally recommend altering this or top_p but not both.

tool_choice
string / object or null
Optional
Controls which (if any) tool is called by the model. none means the model will not call any tool and instead generates a message. auto means the model can pick between generating a message or calling one or more tools. required means the model must call one or more tools. Specifying a particular tool via {"type": "function", "function": {"name": "my_function"}} forces the model to call that tool.

none is the default when no tools are present. auto is the default if tools are present.

Show possible types
tools
array or null
Optional
A list of tools the model may call. Currently, only functions are supported as a tool. Use this to provide a list of functions the model may generate JSON inputs for. A max of 128 functions are supported.

Show properties
top_logprobs
integer or null
Optional
Range: 0 - 20
This is not yet supported by any of our models. An integer between 0 and 20 specifying the number of most likely tokens to return at each token position, each with an associated log probability. logprobs must be set to true if this parameter is used.

top_p
number or null
Optional
Defaults to 1
Range: 0 - 1
An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. We generally recommend altering this or temperature but not both.

user
string or null
Optional
A unique identifier representing your end-user, which can help us monitor and detect abuse.

Response Object
choices
array
A list of chat completion choices. Can be more than one if n is greater than 1.

Show properties
created
integer
The Unix timestamp (in seconds) of when the chat completion was created.

id
string
A unique identifier for the chat completion.

mcp_list_tools
array or null
List of discovered MCP tools from connected servers.

Show properties
model
string
The model used for the chat completion.

object
string
Allowed values: chat.completion
The object type, which is always chat.completion.

service_tier
string or null
Allowed values: auto, on_demand, flex, performance, null
The service tier used for the request.

system_fingerprint
string
This fingerprint represents the backend configuration that the model runs with.

Can be used in conjunction with the seed request parameter to understand when backend changes have been made that might impact determinism.

usage
object
Usage statistics for the completion request.

Show properties
usage_breakdown
Detailed usage breakdown by model when multiple models are used in the request for compound AI systems.

x_groq
object
Groq-specific metadata for non-streaming chat completion responses.

Show properties

curl

curl https://api.groq.com/openai/v1/chat/completions -s \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $GROQ_API_KEY" \
-d '{
  "model": "llama-3.3-70b-versatile",
  "messages": [{
      "role": "user",
      "content": "Explain the importance of fast language models"
  }]
}'
Example Response

{
  "id": "chatcmpl-f51b2cd2-bef7-417e-964e-a08f0b513c22",
  "object": "chat.completion",
  "created": 1730241104,
  "model": "openai/gpt-oss-20b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Fast language models have gained significant attention in recent years due to their ability to process and generate human-like text quickly and efficiently. The importance of fast language models can be understood from their potential applications and benefits:\n\n1. **Real-time Chatbots and Conversational Interfaces**: Fast language models enable the development of chatbots and conversational interfaces that can respond promptly to user queries, making them more engaging and useful.\n2. **Sentiment Analysis and Opinion Mining**: Fast language models can quickly analyze text data to identify sentiments, opinions, and emotions, allowing for improved customer service, market research, and opinion mining.\n3. **Language Translation and Localization**: Fast language models can quickly translate text between languages, facilitating global communication and enabling businesses to reach a broader audience.\n4. **Text Summarization and Generation**: Fast language models can summarize long documents or even generate new text on a given topic, improving information retrieval and processing efficiency.\n5. **Named Entity Recognition and Information Extraction**: Fast language models can rapidly recognize and extract specific entities, such as names, locations, and organizations, from unstructured text data.\n6. **Recommendation Systems**: Fast language models can analyze large amounts of text data to personalize product recommendations, improve customer experience, and increase sales.\n7. **Content Generation for Social Media**: Fast language models can quickly generate engaging content for social media platforms, helping businesses maintain a consistent online presence and increasing their online visibility.\n8. **Sentiment Analysis for Stock Market Analysis**: Fast language models can quickly analyze social media posts, news articles, and other text data to identify sentiment trends, enabling financial analysts to make more informed investment decisions.\n9. **Language Learning and Education**: Fast language models can provide instant feedback and adaptive language learning, making language education more effective and engaging.\n10. **Domain-Specific Knowledge Extraction**: Fast language models can quickly extract relevant information from vast amounts of text data, enabling domain experts to focus on high-level decision-making rather than manual information gathering.\n\nThe benefits of fast language models include:\n\n* **Increased Efficiency**: Fast language models can process large amounts of text data quickly, reducing the time and effort required for tasks such as sentiment analysis, entity recognition, and text summarization.\n* **Improved Accuracy**: Fast language models can analyze and learn from large datasets, leading to more accurate results and more informed decision-making.\n* **Enhanced User Experience**: Fast language models can enable real-time interactions, personalized recommendations, and timely responses, improving the overall user experience.\n* **Cost Savings**: Fast language models can automate many tasks, reducing the need for manual labor and minimizing costs associated with data processing and analysis.\n\nIn summary, fast language models have the potential to transform various industries and applications by providing fast, accurate, and efficient language processing capabilities."
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "queue_time": 0.037493756,
    "prompt_tokens": 18,
    "prompt_time": 0.000680594,
    "completion_tokens": 556,
    "completion_time": 0.463333333,
    "total_tokens": 574,
    "total_time": 0.464013927
  },
  "system_fingerprint": "fp_179b0f92c9",
  "x_groq": { "id": "req_01jbd6g2qdfw2adyrt2az8hz4w" }
}
Responses (beta)
Create response
POST
https://api.groq.com/openai/v1/responses

Creates a model response for the given input.

Request Body
input
string / array
Required
Text input to the model, used to generate a response.

Show possible types
model
string
Required
ID of the model to use. For details on which models are compatible with the Responses API, see available models

instructions
string or null
Optional
Inserts a system (or developer) message as the first item in the model's context.

max_output_tokens
integer or null
Optional
An upper bound for the number of tokens that can be generated for a response, including visible output tokens and reasoning tokens.

metadata
object or null
Optional
Custom key-value pairs for storing additional information. Maximum of 16 pairs.

parallel_tool_calls
boolean or null
Optional
Defaults to true
Enable parallel execution of multiple tool calls.

reasoning
object or null
Optional
Configuration for reasoning capabilities when using models that support reasoning.

Show properties
service_tier
string or null
Optional
Defaults to auto
Allowed values: auto, default, flex
Specifies the latency tier to use for processing the request.

store
boolean or null
Optional
Defaults to false
Response storage flag. Note: Currently only supports false or null values.

stream
boolean or null
Optional
Defaults to false
Enable streaming mode to receive response data as server-sent events.

temperature
number or null
Optional
Defaults to 1
Range: 0 - 2
Controls randomness in the response generation. Range: 0 to 2. Lower values produce more deterministic outputs, higher values increase variety and creativity.

text
object
Optional
Response format configuration. Supports plain text or structured JSON output.

Show properties
tool_choice
string / object or null
Optional
Controls which (if any) tool is called by the model. none means the model will not call any tool and instead generates a message. auto means the model can pick between generating a message or calling one or more tools. required means the model must call one or more tools. Specifying a particular tool via {"type": "function", "function": {"name": "my_function"}} forces the model to call that tool.

none is the default when no tools are present. auto is the default if tools are present.

Show possible types
tools
array or null
Optional
List of tools available to the model. Currently supports function definitions only. Maximum of 128 functions.

Show properties
top_p
number or null
Optional
Defaults to 1
Range: 0 - 1
Nucleus sampling parameter that controls the cumulative probability cutoff. Range: 0 to 1. A value of 0.1 restricts sampling to tokens within the top 10% probability mass.

truncation
string or null
Optional
Defaults to disabled
Allowed values: auto, disabled
Context truncation strategy. Supported values: auto or disabled.

user
string
Optional
Optional identifier for tracking end-user requests. Useful for usage monitoring and compliance.

Response Object
background
boolean
Whether the response was generated in the background.

created_at
integer
The Unix timestamp (in seconds) of when the response was created.

error
object or null
An error object if the response failed.

Show properties
id
string
A unique identifier for the response.

incomplete_details
object or null
Details about why the response is incomplete.

Show properties
instructions
string or null
The system instructions used for the response.

max_output_tokens
integer or null
The maximum number of tokens configured for the response.

max_tool_calls
integer or null
The maximum number of tool calls allowed.

metadata
object or null
Metadata attached to the response.

model
string
The model used for the response.

object
string
Allowed values: response
The object type, which is always response.

output
array
An array of content items generated by the model.

Show possible types
parallel_tool_calls
boolean
Whether the model can run tool calls in parallel.

previous_response_id
string or null
Not supported. Always null.

reasoning
object or null
Configuration options for models that support reasoning.

Show properties
service_tier
string
Allowed values: auto, default, flex
The service tier used for processing.

status
string
Allowed values: completed, failed, in_progress, incomplete
The status of the response generation. One of completed, failed, in_progress, or incomplete.

store
boolean
Whether the response was stored.

temperature
number
The sampling temperature used.

text
object
Text format configuration used for the response.

Show properties
tool_choice
string / object or null
Controls which (if any) tool is called by the model. none means the model will not call any tool and instead generates a message. auto means the model can pick between generating a message or calling one or more tools. required means the model must call one or more tools. Specifying a particular tool via {"type": "function", "function": {"name": "my_function"}} forces the model to call that tool.

none is the default when no tools are present. auto is the default if tools are present.

Show possible types
tools
array
The tools that were available to the model.

Show properties
top_logprobs
integer
The number of top log probabilities returned.

top_p
number
The nucleus sampling parameter used.

truncation
string
Allowed values: auto, disabled
The truncation strategy used.

usage
object
Usage statistics for the response request.

Show properties
user
string or null
The user identifier.

Example request

curl https://api.groq.com/openai/v1/responses -s \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $GROQ_API_KEY" \
-d '{
  "model": "openai/gpt-oss-120b",
  "input": "Tell me a three sentence bedtime story about a unicorn."
}'
Example Response

{
  "id": "resp_01k1x6w9ane6d8rfxm05cb45yk",
  "object": "response",
  "status": "completed",
  "created_at": 1754400695,
  "output": [
    {
      "type": "message",
      "id": "msg_01k1x6w9ane6eb0650crhawwyy",
      "status": "completed",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "When the stars blinked awake, Luna the unicorn curled her mane and whispered wishes to the sleeping pine trees. She galloped through a field of moonlit daisies, gathering dew like tiny silver pearls. With a gentle sigh, she tucked her hooves beneath a silver cloud so the world slept softly, dreaming of her gentle hooves until the morning.",
          "annotations": []
        }
      ]
    }
  ],
  "previous_response_id": null,
  "model": "llama-3.3-70b-versatile",
  "reasoning": {
    "effort": null,
    "summary": null
  },
  "max_output_tokens": null,
  "instructions": null,
  "text": {
    "format": {
      "type": "text"
    }
  },
  "tools": [],
  "tool_choice": "auto",
  "truncation": "disabled",
  "metadata": {},
  "temperature": 1,
  "top_p": 1,
  "user": null,
  "service_tier": "default",
  "error": null,
  "incomplete_details": null,
  "usage": {
    "input_tokens": 82,
    "input_tokens_details": {
      "cached_tokens": 0
    },
    "output_tokens": 266,
    "output_tokens_details": {
      "reasoning_tokens": 0
    },
    "total_tokens": 348
  },
  "parallel_tool_calls": true,
  "store": false
}
Audio
Create transcription
POST
https://api.groq.com/openai/v1/audio/transcriptions

Transcribes audio into the input language.

Request Body
model
string
Required
ID of the model to use. whisper-large-v3 and whisper-large-v3-turbo are currently available.

file
string
Optional
The audio file object (not file name) to transcribe, in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm. Either a file or a URL must be provided. Note that the file field is not supported in Batch API requests.

language
string
Optional
The language of the input audio. Supplying the input language in ISO-639-1 format will improve accuracy and latency.

prompt
string
Optional
An optional text to guide the model's style or continue a previous audio segment. The prompt should match the audio language.

response_format
string
Optional
Defaults to json
Allowed values: json, text, verbose_json
The format of the transcript output, in one of these options: json, text, or verbose_json.

temperature
number
Optional
Defaults to 0
The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit.

timestamp_granularities[]
array
Optional
Defaults to segment
The timestamp granularities to populate for this transcription. response_format must be set verbose_json to use timestamp granularities. Either or both of these options are supported: word, or segment. Note: There is no additional latency for segment timestamps, but generating word timestamps incurs additional latency.

url
string
Optional
The audio URL to translate/transcribe (supports Base64URL). Either a file or a URL must be provided. For Batch API requests, the URL field is required since the file field is not supported.

Response Object
text
string
The transcribed text.


curl

curl https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F file="@./sample_audio.m4a" \
  -F model="whisper-large-v3"
Example Response

{
  "text": "Your transcribed text appears here...",
  "x_groq": {
    "id": "req_unique_id"
  }
}
Create translation
POST
https://api.groq.com/openai/v1/audio/translations

Translates audio into English.

Request Body
model
string
Required
ID of the model to use. whisper-large-v3 and whisper-large-v3-turbo are currently available.

file
string
Optional
The audio file object (not file name) translate, in one of these formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, or webm.

prompt
string
Optional
An optional text to guide the model's style or continue a previous audio segment. The prompt should be in English.

response_format
string
Optional
Defaults to json
Allowed values: json, text, verbose_json
The format of the transcript output, in one of these options: json, text, or verbose_json.

temperature
number
Optional
Defaults to 0
The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit.

url
string
Optional
The audio URL to translate/transcribe (supports Base64URL). Either file or url must be provided. When using the Batch API only url is supported.

Response Object
text
string

curl

curl https://api.groq.com/openai/v1/audio/translations \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F file="@./sample_audio.m4a" \
  -F model="whisper-large-v3"
Example Response

{
  "text": "Your translated text appears here...",
  "x_groq": {
    "id": "req_unique_id"
  }
}
Create speech
POST
https://api.groq.com/openai/v1/audio/speech

Generates audio from the input text.

Request Body
input
string
Required
The text to generate audio for.

model
string
Required
One of the available TTS models.

voice
string
Required
The voice to use when generating the audio. List of voices can be found here.

response_format
string
Optional
Defaults to mp3
Allowed values: flac, mp3, mulaw, ogg, wav
The format of the generated audio. Supported formats are flac, mp3, mulaw, ogg, wav.

sample_rate
integer
Optional
Defaults to 48000
Allowed values: 8000, 16000, 22050, 24000, 32000, 44100, 48000
The sample rate for generated audio

speed
number
Optional
Defaults to 1
Range: 0.5 - 5
The speed of the generated audio.

Returns
Returns an audio file in wav format.


curl

curl https://api.groq.com/openai/v1/audio/speech \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "playai-tts",
    "input": "I love building and shipping new features for our users!",
    "voice": "Fritz-PlayAI",
    "response_format": "wav"
  }'
Example Response

"string"
Models
List models
GET
https://api.groq.com/openai/v1/models

List all available models.

Response Object
data
array
Show properties
object
string
Allowed values: list

curl

curl https://api.groq.com/openai/v1/models \
-H "Authorization: Bearer $GROQ_API_KEY"
Example Response

{
  "object": "list",
  "data": [
    {
      "id": "gemma2-9b-it",
      "object": "model",
      "created": 1693721698,
      "owned_by": "Google",
      "active": true,
      "context_window": 8192,
      "public_apps": null
    },
    {
      "id": "llama3-8b-8192",
      "object": "model",
      "created": 1693721698,
      "owned_by": "Meta",
      "active": true,
      "context_window": 8192,
      "public_apps": null
    },
    {
      "id": "llama3-70b-8192",
      "object": "model",
      "created": 1693721698,
      "owned_by": "Meta",
      "active": true,
      "context_window": 8192,
      "public_apps": null
    },
    {
      "id": "whisper-large-v3-turbo",
      "object": "model",
      "created": 1728413088,
      "owned_by": "OpenAI",
      "active": true,
      "context_window": 448,
      "public_apps": null
    },
    {
      "id": "whisper-large-v3",
      "object": "model",
      "created": 1693721698,
      "owned_by": "OpenAI",
      "active": true,
      "context_window": 448,
      "public_apps": null
    },
    {
      "id": "llama-guard-3-8b",
      "object": "model",
      "created": 1693721698,
      "owned_by": "Meta",
      "active": true,
      "context_window": 8192,
      "public_apps": null
    },
    {
      "id": "distil-whisper-large-v3-en",
      "object": "model",
      "created": 1693721698,
      "owned_by": "Hugging Face",
      "active": true,
      "context_window": 448,
      "public_apps": null
    },
    {
      "id": "llama-3.1-8b-instant",
      "object": "model",
      "created": 1693721698,
      "owned_by": "Meta",
      "active": true,
      "context_window": 131072,
      "public_apps": null
    }
  ]
}
Retrieve model
GET
https://api.groq.com/openai/v1/models/{model}

Get detailed information about a model.

Response Object
created
integer
The Unix timestamp (in seconds) when the model was created.

id
string
The model identifier, which can be referenced in the API endpoints.

object
string
Allowed values: model
The object type, which is always "model".

owned_by
string
The organization that owns the model.


curl

curl https://api.groq.com/openai/v1/models/llama-3.3-70b-versatile \
-H "Authorization: Bearer $GROQ_API_KEY"
Example Response

{
  "id": "llama3-8b-8192",
  "object": "model",
  "created": 1693721698,
  "owned_by": "Meta",
  "active": true,
  "context_window": 8192,
  "public_apps": null,
  "max_completion_tokens": 8192
}
Batches
Create batch
POST
https://api.groq.com/openai/v1/batches

Creates and executes a batch from an uploaded file of requests. Learn more.

Request Body
completion_window
string
Required
The time frame within which the batch should be processed. Durations from 24h to 7d are supported.

endpoint
string
Required
Allowed values: /v1/chat/completions
The endpoint to be used for all requests in the batch. Currently /v1/chat/completions is supported.

input_file_id
string
Required
The ID of an uploaded file that contains requests for the new batch.

See upload file for how to upload a file.

Your input file must be formatted as a JSONL file, and must be uploaded with the purpose batch. The file can be up to 100 MB in size.

metadata
object or null
Optional
Optional custom metadata for the batch.

Response Object
cancelled_at
integer
The Unix timestamp (in seconds) for when the batch was cancelled.

cancelling_at
integer
The Unix timestamp (in seconds) for when the batch started cancelling.

completed_at
integer
The Unix timestamp (in seconds) for when the batch was completed.

completion_window
string
The time frame within which the batch should be processed.

created_at
integer
The Unix timestamp (in seconds) for when the batch was created.

endpoint
string
The API endpoint used by the batch.

error_file_id
string
The ID of the file containing the outputs of requests with errors.

errors
object
Show properties
expired_at
integer
The Unix timestamp (in seconds) for when the batch expired.

expires_at
integer
The Unix timestamp (in seconds) for when the batch will expire.

failed_at
integer
The Unix timestamp (in seconds) for when the batch failed.

finalizing_at
integer
The Unix timestamp (in seconds) for when the batch started finalizing.

id
string
in_progress_at
integer
The Unix timestamp (in seconds) for when the batch started processing.

input_file_id
string
The ID of the input file for the batch.

metadata
object or null
Set of key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format.

object
string
Allowed values: batch
The object type, which is always batch.

output_file_id
string
The ID of the file containing the outputs of successfully executed requests.

request_counts
object
The request counts for different statuses within the batch.

Show properties
status
string
Allowed values: validating, failed, in_progress, finalizing, completed, expired, cancelling, cancelled
The current status of the batch.


curl

curl https://api.groq.com/openai/v1/batches \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input_file_id": "file_01jh6x76wtemjr74t1fh0faj5t",
    "endpoint": "/v1/chat/completions",
    "completion_window": "24h"
  }'
Example Response

{
  "id": "batch_01jh6xa7reempvjyh6n3yst2zw",
  "object": "batch",
  "endpoint": "/v1/chat/completions",
  "errors": null,
  "input_file_id": "file_01jh6x76wtemjr74t1fh0faj5t",
  "completion_window": "24h",
  "status": "validating",
  "output_file_id": null,
  "error_file_id": null,
  "finalizing_at": null,
  "failed_at": null,
  "expired_at": null,
  "cancelled_at": null,
  "request_counts": {
    "total": 0,
    "completed": 0,
    "failed": 0
  },
  "metadata": null,
  "created_at": 1736472600,
  "expires_at": 1736559000,
  "cancelling_at": null,
  "completed_at": null,
  "in_progress_at": null
}
Retrieve batch
GET
https://api.groq.com/openai/v1/batches/{batch_id}

Retrieves a batch.

Response Object
cancelled_at
integer
The Unix timestamp (in seconds) for when the batch was cancelled.

cancelling_at
integer
The Unix timestamp (in seconds) for when the batch started cancelling.

completed_at
integer
The Unix timestamp (in seconds) for when the batch was completed.

completion_window
string
The time frame within which the batch should be processed.

created_at
integer
The Unix timestamp (in seconds) for when the batch was created.

endpoint
string
The API endpoint used by the batch.

error_file_id
string
The ID of the file containing the outputs of requests with errors.

errors
object
Show properties
expired_at
integer
The Unix timestamp (in seconds) for when the batch expired.

expires_at
integer
The Unix timestamp (in seconds) for when the batch will expire.

failed_at
integer
The Unix timestamp (in seconds) for when the batch failed.

finalizing_at
integer
The Unix timestamp (in seconds) for when the batch started finalizing.

id
string
in_progress_at
integer
The Unix timestamp (in seconds) for when the batch started processing.

input_file_id
string
The ID of the input file for the batch.

metadata
object or null
Set of key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format.

object
string
Allowed values: batch
The object type, which is always batch.

output_file_id
string
The ID of the file containing the outputs of successfully executed requests.

request_counts
object
The request counts for different statuses within the batch.

Show properties
status
string
Allowed values: validating, failed, in_progress, finalizing, completed, expired, cancelling, cancelled
The current status of the batch.


curl

curl https://api.groq.com/openai/v1/batches/batch_01jh6xa7reempvjyh6n3yst2zw \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

{
  "id": "batch_01jh6xa7reempvjyh6n3yst2zw",
  "object": "batch",
  "endpoint": "/v1/chat/completions",
  "errors": null,
  "input_file_id": "file_01jh6x76wtemjr74t1fh0faj5t",
  "completion_window": "24h",
  "status": "validating",
  "output_file_id": null,
  "error_file_id": null,
  "finalizing_at": null,
  "failed_at": null,
  "expired_at": null,
  "cancelled_at": null,
  "request_counts": {
    "total": 0,
    "completed": 0,
    "failed": 0
  },
  "metadata": null,
  "created_at": 1736472600,
  "expires_at": 1736559000,
  "cancelling_at": null,
  "completed_at": null,
  "in_progress_at": null
}
List batches
GET
https://api.groq.com/openai/v1/batches

List your organization's batches.

Response Object
data
array
Show properties
object
string
Allowed values: list

curl

curl https://api.groq.com/openai/v1/batches \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

{
  "object": "list",
  "data": [
    {
      "id": "batch_01jh6xa7reempvjyh6n3yst2zw",
      "object": "batch",
      "endpoint": "/v1/chat/completions",
      "errors": null,
      "input_file_id": "file_01jh6x76wtemjr74t1fh0faj5t",
      "completion_window": "24h",
      "status": "validating",
      "output_file_id": null,
      "error_file_id": null,
      "finalizing_at": null,
      "failed_at": null,
      "expired_at": null,
      "cancelled_at": null,
      "request_counts": {
        "total": 0,
        "completed": 0,
        "failed": 0
      },
      "metadata": null,
      "created_at": 1736472600,
      "expires_at": 1736559000,
      "cancelling_at": null,
      "completed_at": null,
      "in_progress_at": null
    }
  ]
}
Cancel batch
POST
https://api.groq.com/openai/v1/batches/{batch_id}/cancel

Cancels a batch.

Response Object
cancelled_at
integer
The Unix timestamp (in seconds) for when the batch was cancelled.

cancelling_at
integer
The Unix timestamp (in seconds) for when the batch started cancelling.

completed_at
integer
The Unix timestamp (in seconds) for when the batch was completed.

completion_window
string
The time frame within which the batch should be processed.

created_at
integer
The Unix timestamp (in seconds) for when the batch was created.

endpoint
string
The API endpoint used by the batch.

error_file_id
string
The ID of the file containing the outputs of requests with errors.

errors
object
Show properties
expired_at
integer
The Unix timestamp (in seconds) for when the batch expired.

expires_at
integer
The Unix timestamp (in seconds) for when the batch will expire.

failed_at
integer
The Unix timestamp (in seconds) for when the batch failed.

finalizing_at
integer
The Unix timestamp (in seconds) for when the batch started finalizing.

id
string
in_progress_at
integer
The Unix timestamp (in seconds) for when the batch started processing.

input_file_id
string
The ID of the input file for the batch.

metadata
object or null
Set of key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format.

object
string
Allowed values: batch
The object type, which is always batch.

output_file_id
string
The ID of the file containing the outputs of successfully executed requests.

request_counts
object
The request counts for different statuses within the batch.

Show properties
status
string
Allowed values: validating, failed, in_progress, finalizing, completed, expired, cancelling, cancelled
The current status of the batch.


curl

curl -X POST https://api.groq.com/openai/v1/batches/batch_01jh6xa7reempvjyh6n3yst2zw/cancel \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

{
  "id": "batch_01jh6xa7reempvjyh6n3yst2zw",
  "object": "batch",
  "endpoint": "/v1/chat/completions",
  "errors": null,
  "input_file_id": "file_01jh6x76wtemjr74t1fh0faj5t",
  "completion_window": "24h",
  "status": "cancelling",
  "output_file_id": null,
  "error_file_id": null,
  "finalizing_at": null,
  "failed_at": null,
  "expired_at": null,
  "cancelled_at": null,
  "request_counts": {
    "total": 0,
    "completed": 0,
    "failed": 0
  },
  "metadata": null,
  "created_at": 1736472600,
  "expires_at": 1736559000,
  "cancelling_at": null,
  "completed_at": null,
  "in_progress_at": null
}
Files
Upload file
POST
https://api.groq.com/openai/v1/files

Upload a file that can be used across various endpoints.

The Batch API only supports .jsonl files up to 100 MB in size. The input also has a specific required format.

Please contact us if you need to increase these storage limits.

Request Body
file
string
Required
The File object (not file name) to be uploaded.

purpose
string
Required
Allowed values: batch
The intended purpose of the uploaded file. Use "batch" for Batch API.

Response Object
bytes
integer
The size of the file, in bytes.

created_at
integer
The Unix timestamp (in seconds) for when the file was created.

filename
string
The name of the file.

id
string
The file identifier, which can be referenced in the API endpoints.

object
string
Allowed values: file
The object type, which is always file.

purpose
string
Allowed values: batch, batch_output
The intended purpose of the file. Supported values are batch, and batch_output.


curl

curl https://api.groq.com/openai/v1/files \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F purpose="batch" \
  -F "file=@batch_file.jsonl"
Example Response

{
  "id": "file_01jh6x76wtemjr74t1fh0faj5t",
  "object": "file",
  "bytes": 966,
  "created_at": 1736472501,
  "filename": "batch_file.jsonl",
  "purpose": "batch"
}
List files
GET
https://api.groq.com/openai/v1/files

Returns a list of files.

Response Object
data
array
Show properties
object
string
Allowed values: list

curl

curl https://api.groq.com/openai/v1/files \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

{
  "object": "list",
  "data": [
    {
      "id": "file_01jh6x76wtemjr74t1fh0faj5t",
      "object": "file",
      "bytes": 966,
      "created_at": 1736472501,
      "filename": "batch_file.jsonl",
      "purpose": "batch"
    }
  ]
}
Delete file
DELETE
https://api.groq.com/openai/v1/files/{file_id}

Delete a file.

Response Object
deleted
boolean
id
string
object
string
Allowed values: file

curl

curl -X DELETE https://api.groq.com/openai/v1/files/file_01jh6x76wtemjr74t1fh0faj5t \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

{
  "id": "file_01jh6x76wtemjr74t1fh0faj5t",
  "object": "file",
  "deleted": true
}
Retrieve file
GET
https://api.groq.com/openai/v1/files/{file_id}

Returns information about a file.

Response Object
bytes
integer
The size of the file, in bytes.

created_at
integer
The Unix timestamp (in seconds) for when the file was created.

filename
string
The name of the file.

id
string
The file identifier, which can be referenced in the API endpoints.

object
string
Allowed values: file
The object type, which is always file.

purpose
string
Allowed values: batch, batch_output
The intended purpose of the file. Supported values are batch, and batch_output.


curl

curl https://api.groq.com/openai/v1/files/file_01jh6x76wtemjr74t1fh0faj5t \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

{
  "id": "file_01jh6x76wtemjr74t1fh0faj5t",
  "object": "file",
  "bytes": 966,
  "created_at": 1736472501,
  "filename": "batch_file.jsonl",
  "purpose": "batch"
}
Download file
GET
https://api.groq.com/openai/v1/files/{file_id}/content

Returns the contents of the specified file.

Returns
The file content


curl

curl https://api.groq.com/openai/v1/files/file_01jh6x76wtemjr74t1fh0faj5t/content \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json"
Example Response

"string"
Fine Tuning
List fine tunings
GET
https://api.groq.com/v1/fine_tunings

Lists all previously created fine tunings. This endpoint is in closed beta. Contact us for more information.

Response Object
data
array
Show properties
object
string

curl

curl https://api.groq.com/v1/fine_tunings -s \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $GROQ_API_KEY"
Example Response

{
    "object": "list",
    "data": [
        {
            "id": "string",
            "name": "string",
            "base_model": "string",
            "type": "string",
            "input_file_id": "string",
            "created_at": 0,
            "fine_tuned_model": "string"
        }
    ]
}
Create fine tuning
POST
https://api.groq.com/v1/fine_tunings

Creates a new fine tuning for the already uploaded files This endpoint is in closed beta. Contact us for more information.

Request Body
base_model
string
Optional
BaseModel is the model that the fine tune was originally trained on.

input_file_id
string
Optional
InputFileID is the id of the file that was uploaded via the /files api.

name
string
Optional
Name is the given name to a fine tuned model.

type
string
Optional
Type is the type of fine tuning format such as "lora".

Response Object
data
object
Show properties
id
string
object
string

curl

curl https://api.groq.com/v1/fine_tunings -s \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $GROQ_API_KEY" \
    -d '{
        "input_file_id": "<file-id>",
        "name": "test-1",
        "type": "lora",
        "base_model": "llama-3.1-8b-instant"
    }'
Example Response

{
    "id": "string",
    "object": "object",
    "data": {
        "id": "string",
        "name": "string",
        "base_model": "string",
        "type": "string",
        "input_file_id": "string",
        "created_at": 0,
        "fine_tuned_model": "string"
    }
}
Get fine tuning
GET
https://api.groq.com/v1/fine_tunings/{id}

Retrieves an existing fine tuning by id This endpoint is in closed beta. Contact us for more information.

Response Object
data
object
Show properties
id
string
object
string

curl

curl https://api.groq.com/v1/fine_tunings/:id -s \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $GROQ_API_KEY"
Example Response

{
    "id": "string",
    "object": "object",
    "data": {
        "id": "string",
        "name": "string",
        "base_model": "string",
        "type": "string",
        "input_file_id": "string",
        "created_at": 0,
        "fine_tuned_model": "string"
    }
}
Delete fine tuning
DELETE
https://api.groq.com/v1/fine_tunings/{id}

Deletes an existing fine tuning by id This endpoint is in closed beta. Contact us for more information.

Response Object
deleted
boolean
id
string
object
string

curl

curl -X DELETE https://api.groq.com/v1/fine_tunings/:id -s \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $GROQ_API_KEY"
Example Response

{
    "id": "string",
    "object": "fine_tuning",
    "deleted": true
}