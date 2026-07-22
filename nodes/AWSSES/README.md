# AWS SES

A custom n8n node for Amazon Simple Email Service (SES) — the classic Query API
(`2010-12-01`), covering email sending, identity/domain verification, templates,
configuration sets, receipt rules, and account status.

## Why this node exists

n8n ships a generic `AWS` node that can call SES, but you have to hand-build every
request (action name, XML-flavoured parameter names, SigV4 auth) yourself. This node
gives you a proper Resource/Operation UI over the whole SES v1 API surface, handles
SigV4 signing internally, and parses the XML responses back into plain JSON.

## Credential — AWS SES API

Add a new **AWS SES API** credential with:

| Field | Required | Notes |
|---|---|---|
| Access Key ID | Yes | An IAM user/role key with `ses:*` permissions |
| Secret Access Key | Yes | |
| Session Token | No | Only needed for temporary credentials (e.g. an STS `AssumeRole`) |
| Region | Yes | e.g. `us-east-1`, `eu-west-1` — must match where your identities/templates live |
| Custom Endpoint | No | Override `https://email.<region>.amazonaws.com`, e.g. to point at a VPC endpoint |

There's no separate "sandbox" vs "production" setting on the credential, because AWS
SES doesn't expose that as a different endpoint — it's an account-level flag that AWS
Support lifts after a production-access review. **Testing the credential** (the
"Test" button in the credential UI) calls `GetSendQuota` to confirm the keys work, and
then also calls the SESv2 `GetAccount` endpoint to report which mode the account is
in:

- *"Account is in the SES sandbox (can only send to/from verified identities)"* — you
  can only send to addresses/domains you've verified, and you're capped at a low
  daily quota (typically 200 messages/24h). This is the default for every new SES
  account/region.
- *"Account has production sending access"* — you can send to any recipient.

Use the **Account → Get Account Details** operation from the node itself at any time
to pull the same information (plus daily quota and any pending review details) into
your workflow.

## Resources & operations

| Resource | Operations |
|---|---|
| **Email** | Send Email, Send Raw Email (with attachments), Send Templated Email, Send Bulk Templated Email, Send Custom Verification Email, Send Bounce |
| **Identity** | Verify Email Identity, Verify Domain Identity, Verify Domain DKIM, Delete, List, Get/Set DKIM Enabled, Get/Set Feedback Forwarding, Get/Set Headers-in-Notifications, Get/Set Mail-From Domain, Get/Set Notification Topic, Get/List/Put/Delete Policies, Get Verification/Notification Attributes |
| **Template** | Create, Update, Delete, Get, List, Test Render |
| **Custom Verification Template** | Create, Update, Delete, Get, List |
| **Configuration Set** | Create, Delete, Describe, List, Put Delivery Options, Create/Update/Delete Event Destination, Update Reputation Metrics Enabled, Update Sending Enabled, Create/Update/Delete Tracking Options |
| **Receipt Rule Set** | Clone, Create, Delete, Describe, Describe Active, List, Reorder, Set Active |
| **Receipt Rule** | Create, Delete, Describe, Update, Set Position |
| **Receipt Filter** | Create, Delete, List |
| **Account** | Get Account Details (sandbox/production status), Get Send Quota, Get Send Statistics, Get/Update Sending Enabled |

### Sending an email

**Email → Send Email** covers the common case: From, To/CC/BCC, Subject, and a Text
and/or HTML body, plus Reply-To, Return Path and Configuration Set Name under
"Additional Fields".

### Sending an email with attachments

**Email → Send Raw Email** has two compose modes:

- **Simple (with Attachments)** *(default)* — fill in From/To/CC/BCC/Subject/Body
  fields as usual, then list the binary property names on the current item (e.g.
  `data` from an HTTP Request or Read Binary File node, comma-separated for several
  files) under **Attachment Binary Properties**. The node builds a correct
  multipart MIME message for you.
- **Raw MIME** — paste a complete, hand-written MIME message (headers included) if
  you need full control. You don't base64-encode it yourself; the node does that.

### Templates

Create a template once (**Template → Create**, with `{{variable}}` placeholders in
the Subject/Text/HTML parts), then send it repeatedly with **Email → Send Templated
Email** (single recipient set) or **Email → Send Bulk Templated Email** (up to 50
destinations per call, each with its own replacement data). Use **Template → Test
Render** to preview the merged output before sending.

### Verifying a sender

1. **Identity → Verify Email Identity** (single address) or **Verify Domain
   Identity** (whole domain) — sends a verification email, or returns a TXT record
   token to add to your DNS, respectively.
2. For DKIM signing, **Identity → Verify Domain DKIM** returns three CNAME tokens to
   add to DNS; check propagation with **Get DKIM Attributes**.
3. Check overall status any time with **Identity → Get Verification Attributes**.

### Fields that take raw JSON

A handful of SES inputs are deeply nested AWS structures with no realistic
one-field-per-property UI. These take a JSON string instead, matching the shapes
documented in the [SES API reference](https://docs.aws.amazon.com/ses/latest/APIReference-V1/Welcome.html):

- **Configuration Set → Create/Update Event Destination** — `EventDestination` (SNS/CloudWatch/Kinesis Firehose object)
- **Receipt Rule → Create/Update** — `Rule` (recipients, actions, TLS policy, etc.)
- **Email → Send Bulk Templated Email** — `Destinations` (array of per-recipient replacement data)
- **Email → Send Bounce** — `Bounced Recipient Info List`, and optionally `Message DSN`
- **Identity → Put Policy** — the IAM sending-authorization policy document

### Pagination

Every `List*` operation (Identities, Templates, Configuration Sets, Custom
Verification Templates, Receipt Rule Sets) has a **Return All** toggle. Off (default),
you get one page back plus a `NextToken` you can feed into a subsequent call by hand.
On, the node follows `NextToken` automatically and emits one output item per record.

## Testing against sandbox vs. production

Because sandbox/production is an account property rather than an endpoint, testing
both modes just means testing with two different credentials — a sandbox-restricted
account and one with production access:

1. Point a credential at a fresh/sandbox AWS account (or a region within a
   production account that hasn't requested production access). Verify a sender and
   a recipient address (**Identity → Verify Email Identity**, twice), then run
   **Email → Send Email** between those two verified addresses — sandbox accounts
   reject sends to anyone else with a `MessageRejected` error.
2. Point a second credential at an account with production access confirmed (test
   the credential, or run **Account → Get Account Details** and check
   `ProductionAccessEnabled`). Sends to arbitrary recipients should succeed there.
3. AWS also publishes SES [simulator addresses](https://docs.aws.amazon.com/ses/latest/dg/references-simulator-addresses.html)
   (`success@simulator.amazonses.com`, `bounce@simulator.amazonses.com`, etc.) that
   work in both sandbox and production without needing verification on the
   recipient side — useful for exercising bounce/complaint handling safely.

## Error messages

Failures surface as `AWS SES: <Action> failed - <Code>: <Message>`, where `<Code>`
and `<Message>` are pulled directly out of SES's XML `ErrorResponse` body (e.g.
`MessageRejected: Email address is not verified`) rather than a generic HTTP status.

## Limitations / known gaps

- This node targets the **v1 Query API** exclusively, except for `Get Account
  Details`, which uses the newer SESv2 REST API (the only way to read
  `ProductionAccessEnabled`). If you need other SESv2-only features (e.g. contact
  lists, dedicated IP pools), they aren't covered here yet.
- `Send Raw Email` in Simple mode reads attachments from **binary properties on the
  current item only** — for per-recipient attachments in a bulk send, use Raw MIME
  mode and build the message per item upstream.
