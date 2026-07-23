PIN Checker by PIN
By KRA

https://sbx.kra.go.ke/checker/v1/pinbypin

Sign in to Simulate API

Documentation

📌 Overview
To successfully invoke this API, you must first generate an access token via the Authorization API. This token must be included as a Bearer token in the Authorization header of your API request.

This guide includes:

How to generate the access token
How to use the token in the API request
Request/response examples
Error handling
Sample data section for testing
🔐 Step 1: Generate Access Token (Authorization API)
Request Details
Use your Consumer Key and Consumer Secret as Basic Auth credentials (username and password) to generate an access token.

Endpoint:

GET https://sbx.kra.go.ke/v1/token/generate?grant_type=client_credentials - Sandbox Endpoint
GET https://api.kra.go.ke/v1/token/generate?grant_type=client_credentials - Production Endpoint
Headers:

Authorization: Basic <Base64Encoded(Consumer_Key:Consumer_Secret)>
Success Response
{
  "access_token": "qblts2rRqMKBG7mvP7AkLZfnWjER",
  "expires_in": "3599"
}
Field	Description
access_token	Token to be used as Bearer token in API requests
expires_in	Time in seconds before the token expires (e.g. 3600)
Error Response
{
    "requestId": "83f2-4b48-bdf5-4c7e1a67dbcb39076",
    "errorCode": "401",
    "errorMessage": "Client credentials are invalid"
}
errorCode	errorMessage
401	Client credentials are invalid
⚠️ Note: No need to create a separate app for Authorization. Use the same app created for this API.

✅ Step 2: Invoke PIN Checker by PIN API
Endpoint:

POST https://sbx.kra.go.ke/checker/v1/pinbypin - Sandbox Endpoint
POST https://api.kra.go.ke//checker/v1/pinbypin - Production Endpoint
Request Example
POST https://sbx.kra.go.ke/checker/v1/pinbypin
Headers:

{
  "Content-Type": "application/json",
  "Authorization": "Bearer qblts2rRqMKBG7mvP7AkLZfnWjER"
}
Body:

{
    "KRAPIN": "P318295670X"
  
}
Request Parameters
No.	Field Name	Data Type	Description
1	KRAPIN	STRING	PIN of the taxpayer to be validated by another system.
Format: Starts with “A” or “P”, followed by 9 digits, ending with any alphabet.
Possible Responses
Successful response

{
    "ResponseCode": "23000",
    "Message": "Valid PIN",
    "Status": "OK",
    "PINDATA": {
        "KRAPIN": "P318295670X",
        "TypeOfTaxpayer": "Non Individual",
        "Name": "T. AN 052318TEST NA NA",
        "StatusOfPIN": "Active"
    }
}
Below table describes each field in the above JSON

No.	Field/Attribute	Description
1	ResponseCode	Represents the code for different messages which can be sent to other organization systems.
2	Message	Represents the description of the ResponseCode sent to the system.
3	Status	OK/NOK.
4	KRAPIN	PIN of the taxpayer which was requested to be validated.
5	TypeOfTaxpayer	Type of the taxpayer (Possible values: Individual / Non Individual).
6	Name	Name of the taxpayer. For Non Individual taxpayers, this contains the full name.
9	StatusOfPIN	Status of the PIN (Mandatory). Possible values:
• Active
• Suspended
• Cancelled
• Stopped
Exceptions
Response Code	Status	Message
19005	NOK	Invalid PIN
🧪 Sample Data (For Testing)
KRAPIN
A744610021G
A521040203F
P318295670X
📎 Tip: Use the My Apps section to get your app credentials.

Use case
For validating taxpayer information in the iTax system using KRA PIN