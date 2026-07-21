
GavaConnect logo
GavaConnect





​
Search




Home

Discover APIs

eTIMS OSCU Integrator Automated Testing

eTIMS OSCU Integrator Automated Testing
By KRA

https://sbx.kra.go.ke/etims-oscu/api/v1/{path_suffix}

Sign in to Simulate API

Documentation

Overview
KRA has implemented the Electronic Tax Invoice Management System (eTIMS) to achieve validations and signing of tax invoices at Trader Invoicing Systems(TIS) before generation of the invoices along with their real time or near real time transmission to KRA. eTIMS is an information technology integration system that integrates trader invoicing systems with iTax by enabling generation of compliant electronic tax invoices and their transmission through the internet . eTIMS enhances iTax system's capability to process tax invoices thereby increasing its efficiency and effectiveness in tax administration through simplification users’ interaction as well as enabling trader invoicing system integrations.

Process Overview
Contents

Sign Up
Discovery and Simulation
Testing
KYC Documentation
Verification
Go Live
Use Cases
eTIMS OSCU Integration Step-by-Step Guide
1. SIGN UP
A. Sign Up for Access on the eTIMS Taxpayer Sandbox Portal
Access the Portal:
Go to: eTIMS Taxpayer Sandbox Portal.

Complete the Sign-Up Form:
Select the PIN option.
Enter your company’s KRA PIN.
Verify the masked phone number for OTP delivery. If incorrect, email timsupport@kra.go.ke to update it.
Create and confirm a password for portal access.
B. Register for OSCU Device
Log In:
Use your KRA PIN and password to access the portal.

Login Page

Service Request

Click the Service Request button on the homepage.

Select eTIMS

Choose the eTIMS option in the dialog box.

Complete the Service Request Form.

Select the appropriate eTIMS type:

VSCU: Client-side hosted for large invoice volumes.
OSCU: KRA-hosted, requires API integration for online systems.
eTIMS Client: Standalone applications for various devices.
eTIMS Online: For service sector taxpayers issuing ≤10 invoices/month.
Receive Confirmation

After processing, you’ll get an SMS confirming approval for eTIMS installation in your KRA account.

C. Setup for OSCU
1.Upon approval of OSCU, a taxpayer will access the OSCU from KRA servers and start activation.

2.The OSCU running process, main configurations and technical policies are detailed in the OSCU Specifications document/guide section 2.2.

Note that the services included in the sequence definitions are to be used with the below URLs:

Sandbox environment use: https://sbx.kra.go.ke
e.g. the URL path for OSCU device activation is indicated as (url: /initialize); therefore, the full URL path is https://sbx.kra.go.ke/etims-oscu/api/v1/initialize in the sandbox environment.

3.The Trader Invoicing System (TIS) will need to invoke the initialization Method of OSCU with PIN, branch office ID, and equipment information. After which the OSCU will begin verification of the device and receive communication key from the KRA eTIMS API server.

4.The Taxpayer PIN, branch office ID and Communication key are critical details that are necessary for communications between the TIS and eTIMS OSCU API server.

⬆ Back to Contents

2. DISCOVERY AND SIMULATION
D. App creation
Create your application using the eTIMS OSCU API. This is the first step in setting up your system for automated testing and verification.

E. Initialization and System Functionalities(Process Flow)
The functionalities of OSCU/VSCU are grouped into eight (8) categories based on their purpose. The below briefly introduces the purpose of each category.

i. Initialization (Send only)
This functionality maps the provided PIN, Branch Code and serial number during the service request process to the TIS being integrated.

NOTE: For VSCU/OSCU initialization, registration and approval of the e-TIMS type must have been completed.

Endpoint:

OSCU Initialization path suffix: /initialize
Request Body
{
    "tin": "A123456789Z",
    "bhfId": "00",
    "dvcSrlNo": "dvcv1130"
}
Request Parameter Definition
Name	Description	Type	Sample Values
tin	KRA PIN.	String	A123456789Z
bhfId	Branch Id.	String	00
dvcSrlNo	Device Serial Number.	String	dvcv1130
Response Body
{
    "resultCd": "000",
    "resultMsg": "It is succeeded",
    "resultDt": "20200226143124",
    "data": {
        "info": {
            "tin": "A123456789Z",
            "taxprNm": "Taxpayer1130",
            "bsnsActv": "business",
            "bhfId": "00",
            "bhfNm": "Headquater",
            "bhfOpenDt": "20200226",
            "prvncNm": "NAIROBI CITY",
            "dstrtNm": "WESTLANDS",
            "sctrNm": "WON",
            "locDesc": "Westlands Towers",
            "hqYn": "Y",
            "mgrNm": "manage1130_00",
            "mgrTelNo": "0789001130",
            "mgrEmail": "manage113000@test.com",
            "dvcId": "9999911300000001",
            "sdcId": "KRACU013000001",
            "mrcNo": "WIS01000150",
            "cmcKey": "f0b9831bd2334874b7ec815e40347bc4"
        }
    }
}
Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	Result Code	String	000
resultMsg	Result Message	String	It is succeeded
resultDt	Result Date	String	20200226143124
tin	Taxpayer Identification	Number	String
taxprNm	Taxpayer Name	String	Taxpayer1130
bsnsActv	Business Activity	String	business
bhfId	Branch Office Id	String	00
bhfNm	Branch Office Name	String	Headquater
bhfOpenDt	Branch Registration Date	String	20200226
prvncNm	County Name	String	NAIROBI CITY
dstrtNm	District Name	String	WESTLANDS
sctrNm	Sector Name	String	WON
locDesc	Location Description	String	Westlands Towers
hqYn	Headquarter Branch Indicator (Y/N)	String	Y
mgrNm	Manager Name	String	manage1130_00
mgrTelNo	Manager Telephone Number	String	0789001130
mgrEmail	Manager Email Address	String	manage113000@test.com
dvcId	Device ID	String	9999911300000001
sdcId	SDC ID	String	KRACU013000001
mrcNo	MRC Number	String	WIS01000150
cmcKey	Communication KEY	String	f0b9831bd2334874b7ec815e40347bc4
ii. Basic Data Management (Get only)
This category of functionalities is used to get necessary standard codes and data from the eTIMS API Server, which is the basis of generating invoice data. The standard codes and data include item classification code for managing items, location code, package, weight code, PIN list, and notices from KRA. For more information, check the code definition chapter.

NOTE: To send Invoice data to the eTIMS API server, the consistency of the data is essential.

Endpoints:

Get Code list path suffix: /select-code-list
Get Item Classification List path suffix:/select-item-class
Branch List <New Endpoints> path suffix: /branch-list
Get notice list path suffix: /selectNoticeList
Get Taxpayer Info path suffix: /selectTaxpayerInfo
Get Customer PIN Info path suffix: /selectCustomerList
Common Headers for all Basic Data Management APIs:
tin: P000000014I
bhfId: 00
cmcKey: F7EA74F0706441358AD4B8D5EA09BF8302B6799C99894DB0B2AC
Request Body
// Get Code List - /selectCodeList
{
  "tin": "A123456789Z",
  "bhfId": "00",
  "lastReqDt": "20220101010101",
}

// Get Item Classification List - /selectItemClsList
{
  "tin": "P051402944X",
  "bhfId": "00",
  "lastReqDt": "20180523000000"
}

// Get Customer Pin List - /selectCustomer
{
  "tin":"P051402944X",
  "bhfId": "00",
  "custmTin": "A123456789Z"
}

// Get Branch List - /selectBhfList
{
  "lastReqDt":"20180520000000"
}

// Get Notice List - /selectNotices
{
  "tin": "P051402944X",
  "bhfId": "00",
  "lastReqDt": "20180523000000"
}


Request Parameter Definition
Name	Description	Type	Sample Values
tin	KRA PIN.	String	P051402944X
bhfId	Branch Id.	String	00
lastReqDt	Last Request Date and Time.	String	20220101010101
custmTin	Customer PIN	String	A123456789Z
Response Body
// Get Code List - /selectCodeList
    {
      resultCd: "000",
      resultMsg: "It is succeeded",
      resultDt: "20200226143506",
      data: {
        clsList: [
          {
            cdCls: "04",
            cdClsNm: "Taxation Type",
            cdClsDesc: null,
            useYn: "Y",
            userDfnNm1: "Tax Rate",
            userDfnNm2: null,
            userDfnNm3: null,
            dtlList: [
              {
                cd: "A",
                cdNm: "AEX",
                cdDesc: "...",
                useYn: "Y",
                srtOrd: 1,
                userDfnCd1: "0",
                userDfnCd2: null,
                userDfnCd3: null,
              },
              {
                cd: "B",
                cdNm: "B-18.00%",
                cdDesc: "B-18.00%",
                useYn: "Y",
                srtOrd: 2,
                userDfnCd1: "18",
                userDfnCd2: null,
                userDfnCd3: null,
              },
              {
                cd: "C",
                cdNm: "C",
                cdDesc: "C",
                useYn: "Y",
                srtOrd: 3,
                userDfnCd1: "0",
                userDfnCd2: null,
                userDfnCd3: null,
              },
              {
                cd: "D",
                cdNm: "D",
                cdDesc: "D",
                useYn: "Y",
                srtOrd: 4,
                userDfnCd1: "0",
                userDfnCd2: null,
                userDfnCd3: null,
              },
            ],
          },
        ],
      },
    }

// Get Item Classification List - /selectItemClsList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226185625",
  "data": {
    "itemClsList": [
      {
        "itemClsCd": "14111400",
        "itemClsNm": "Paper products no use",
        "itemClsLvl": 3,
        "taxTyCd": null,
        "mjrTgYn": null,
        "useYn": "Y"
      },
      {
        "itemClsCd": "14111401",
        "itemClsNm": "Paper products no use Commodity",
        "itemClsLvl": 4,
        "taxTyCd": null,
        "mjrTgYn": null,
        "useYn": "Y"
      },
      {
        "itemClsCd": "3133130600",
        "itemClsNm": "Non metallic sonic welded structural assemblies",
        "itemClsLvl": 5,
        "taxTyCd": "B",
        "mjrTgYn": "N",
        "useYn": "Y"
      }
    ]
  }
}

// Get Customer Pin List - /selectCustomer
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226192053",
  "data": {
    "custList": [
      {
        "tin": "A123456789Z",
        "taxprNm": "TAXPAYER1",
        "taxprSttsCd": "A",
        "prvncNm": "NAIROBI CITY",
        "dstrtNm": "WESTLANDS",
        "sctrNm": "WON",
        "locDesc": "Westlands Towers"
      }
    ]
  }
}

// Get Branch List - /selectBhfList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226193023",
  "data": {
    "bhfList": [
      {
        "tin": "A123456789Z",
        "bhfId": "00",
        "bhfNm": "Headquater",
        "bhfSttsCd": "01",
        "prvncNm": "NAIROBI CITY",
        "dstrtNm": "WESTLANDS",
        "sctrNm": "WON",
        "locDesc": "Westlands Towers",
        "mgrNm": "manage1130_00",
        "mgrTelNo": "0789001130",
        "mgrEmail": "manage113000@test.com",
        "hqYn": "Y"
      },
      {
        "tin": "A123456789Z",
        "bhfId": "01",
        "bhfNm": "Branch01",
        "bhfSttsCd": "01",
        "prvncNm": "NAIROBI CITY",
        "dstrtNm": "WESTLANDS",
        "sctrNm": "WON",
        "locDesc": "Westlands Towers",
        "mgrNm": "manage1130_01",
        "mgrTelNo": "0789011130",
        "mgrEmail": "manage113001@test.com",
        "hqYn": "N"
      }
    ]
  }
}

// Get Notice List - /selectNoticeList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226191722",
  "data": {
    "noticeList": [
      {
        "noticeNo": 42,
        "title": "Notice Test [2020.02.18]",
        "cont": "Notice Test [2020.02.18]",
        "dtlUrl": "http://localhost:9980/common/link/ebm/receipt/indexEbmNotice?noticeNo=42",
        "regrNm": "Administrator",
        "regDt": "20200218191141"
      }
    ]
  }
}
Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	A code indicating the outcome of the API request.	String	000
resultMsg	A human-readable message explaining the outcome of the API request.	String	It is succeeded
resultDt	The date and time when the server generated the response.	String	20200226185625
data	Contains the main response data structure.	Object	
itemClsList	List of item classifications.	Array	
itemClsCd	The code of the item classification.	String	14111400
itemClsNm	The name of the item classification.	String	Paper products no use
itemClsLvl	The level of the item classification.	Integer	3
taxTyCd	Tax type code associated with the item classification.	String	
mjrTgYn	Indicates if the item classification is a major target.	String	
useYn	Indicates if the item classification is currently in use.	String	Y
custList	List of customers.	Array	
tin	Taxpayer Identification Number.	String	A123456789Z
taxprNm	Name of the taxpayer.	String	TAXPAYER1
taxprSttsCd	Status code of the taxpayer.	String	A
prvncNm	Name of the province where the taxpayer is located.	String	NAIROBI CITY
dstrtNm	Name of the district where the taxpayer is located.	String	WESTLANDS
sctrNm	Name of the tax locality where the taxpayer is located.	String	WON
locDesc	Description of the taxpayer's location.	String	Westlands Towers
bhfList	List of branches.	Array	
bhfId	Branch ID.	String	00
bhfNm	Name of the branch.	String	Headquater
bhfSttsCd	Status code of the branch.	String	01
mgrNm	Name of the branch manager.	String	manage1130_00
mgrTelNo	Contact number of the branch manager.	String	0789001130
mgrEmail	Email address of the branch manager.	String	manage113000@test.com
hqYn	Indicates whether the branch is the headquarters.	String	Y
noticeList	List of notices.	Array	
noticeNo	The notice number.	Integer	42
title	Title of the notice.	String	Notice Test [2020.02.18]
cont	Content of the notice.	String	Notice Test [2020.02.18] Notice Test[2020.02.18]
dtlUrl	URL for more details on the notice.	String	http://localhost:9980/common/link/ebm/receipt/indexEbmNotice?noticeNo=42
regrNm	Name of the person who registered the notice.	String	Administrator
regDt	Registration date of the notice.	String	20200218191141
iii. Branch Information Management (Get and Send)
Functionalities in this category allows the TIS to send list of head and branch office(s), and user information of branch offices to e-TIMS API server.

NOTE:

i. For Pharmacy, there is a functionality for sending insurance information of the head & branch offices to e-TIMS API Server.

ii. Branch codes will be used while sending stock within branch office(s).

Endpoints:

Send customer information path suffix: /selectBhfList
Send branch user account path suffix: /selectImportItemList
Send branch insurance information path suffix: /branchInsuranceInfo
Common Headers for all Basic Data Management APIs:
tin: P051402944X
bhfId: 00
cmcKey: B7294E9830B24224936A6CF86D469773CA858A464C7A4431AEB3
Request Body
// Send customer information - /saveBhfCustomer
{
    "custNo": "999991113",
    "custTin": "A123456789Z",
    "custNm": "MTEJA LIMITED",
    "adrs": null,
    "telNo": null,
    "email": null,
    "faxNo": null,
    "useYn": "Y",
    "remark": null,
    "regrNm": "Admin",
    "regrId": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin"
}

// Send branch user account - /saveBhfUser
{
    "userId": "userId3",
    "userNm": "UserName3",
    "pwd": "12341234",
    "adrs": null,
    "cntc": null,
    "authCd": null,
    "remark": null,
    "useYn": "Y",
    "regrNm": "Admin",
    "regrId": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin"
}

// Send branch insurance information - /saveBhfInsurance
{
    "isrccCd": "ISRCC01",
    "isrccNm": "RSSB Insurance",
    "isrcRt": 20,
    "useYn": "Y",
    "regrNm": "Admin",
    "regrId": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin"
}

Request Parameter Definition
Name	Description	Type	Sample Values
custNo	Customer Number	String	999991113
custTin	Customer PIN	String	A123456789Z
custNm	Customer Name	String	MTEJA LIMITED
adrs	Address	String	null
telNo	Contact Number	String	null
email	Email	String	null
faxNo	Fax Number	String	null
useYn	Used (Y/N)	String	Y
remark	Remark	String	null
regrNm	Registration Name	String	Admin
regrId	Registration ID	String	Admin
modrNm	Modifier Name	String	Admin
modrId	Modifier ID	String	Admin
Response Body


// Send customer information - /saveBhfCustomer
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226193115",
  "data": null
}

// Send branch user account - /saveBhfUser
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226192427",
  "data": null
}

// Send branch insurance information - /saveBhfInsurance
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226192852",
  "data": null
}
Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	Result Code	String	000
resultMsg	Result Message	String	It is succeeded
resultDt	Result Date	String	20200226193115
data	data	null	null
iv. Item Management (Get and Send)
Functionalities in this category allows TIS to send item information to and get item list from eTIMS API Server.

NOTE: In case you want to recover your items, you can receive them through eTIMS API server.

Endpoints:

Send/Save Item information path suffix: /saveItem
Get Item Info path suffix: /itemInfo
Send Item Composition path suffix: /saveItemComposition
Common Headers for all Basic Data Management APIs:
tin: P051402944X
bhfId: 00
cmcKey: B7294E9830B24224936A6CF86D469773CA858A464C7A4431AEB3
Request Body
// Send/Save Item information - /saveItem
{
    "itemCd": "KE1NTXU0000006",
    "itemClsCd": "5059690800",
    "itemTyCd": "1",
    "itemNm": "test materialitem 3",
    "itemStdNm": null,
    "orgnNatCd": "KE",
    "pkgUnitCd": "NT",
    "qtyUnitCd": "U",
    "taxTyCd": "B",
    "btchNo": null,
    "bcd": null,
    "dftPrc": 3500,
    "grpPrcL1": 3500,
    "grpPrcL2": 3500,
    "grpPrcL3": 3500,
    "grpPrcL4": 3500,
    "grpPrcL5": null,
    "addInfo": null,
    "sftyQty": null,
    "isrcAplcbYn": "N",
    "useYn": "Y",
    "regrNm": "Admin",
    "regrId": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin"
}

// Get Item information - /selectItemList
{
    "lastReqDt": "20160523000000"
}
    
// Send Item Composition - saveItemComposition
{
    "itemCd": "KE1NTXU0000007",
    "cpstItemCd": "ITM001",
    "cpstQty": 10,
    "regrId": "Admin",
    "regrNm": "Admin"
}
Details
Request Parameter Definition
Name	Description	Type	Sample Values
itemCd	Item Code	String	KE1NTXU0000006
itemClsCd	Item Classification Code	String	5059690800
itemTyCd	Item Type Code	String	1
itemNm	Item Name	String	test materialitem 3
itemStdNm	Item Standard Name	String	null
orgnNatCd	Origin Place Code (Nation)	String	KE
pkgUnitCd	Packaging Unit Code	String	NT
qtyUnitCd	Quantity Unit Code	String	U
taxTyCd	Taxation Type Code	String	B
btchNo	Batch Number	String	null
bcd	Barcode	String	null
dftPrc	Default Unit Price	Number	3500
grpPrcL1	Group1 Unit Price	Number	3500
grpPrcL2	Group2 Unit Price	Number	3500
grpPrcL3	Group3 Unit Price	Number	3500
grpPrcL4	Group4 Unit Price	Number	3500
grpPrcL5	Group5 Unit Price	Number	null
addInfo	Additional Information	String	null
sftyQty	Safety Quantity	Number	null
isrcAplcbYn	Insurance Applicable (Y/N)	String	N
useYn	Used / Unused	String	Y
regrNm	Registration Name	String	Admin
regrId	Registration ID	String	Admin
modrNm	Modifier Name	String	Admin
modrId	Modifier ID	String	Admin
lastReqDt	Last Request Date	String	20160523000000
cpstItemCd	Composition Item Code	String	ITM001
cpstQty	Composition Quantity	Number	10
Response Body
// Send/Save Item information - /saveItem
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226193918",
  "data": null
}

// Get Item information - /selectItemList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226193501",
  "data": {
    "itemList": [
      {
        "tin": "A123456789Z",
        "itemCd": "KR2AMXBLL0000001",
        "itemClsCd": "1110160600",
        "itemTyCd": "2",
        "itemNm": "rest item#1",
        "itemStdNm": null,
        "orgnNatCd": "KR",
        "pkgUnitCd": "AM",
        "qtyUnitCd": "BLL",
        "taxTyCd": "B",
        "btchNo": null,
        "regBhfId": "00",
        "bcd": "8801234567061",
        "dftPrc": 21000,
        "grpPrcL1": 0,
        "grpPrcL2": 0,
        "grpPrcL3": 0,
        "grpPrcL4": 0,
        "grpPrcL5": 0,
        "addInfo": null,
        "sftyQty": 0,
        "isrcAplcbYn": "N",
        "rraModYn": "N",
        "useYn": "Y"
      },
      {
        "tin": "A123456789Z",
        "itemCd": "KR2AMXCAX0000001",
        "itemClsCd": "1110170400",
        "itemTyCd": "2",
        "itemNm": "coke1",
        "itemStdNm": null,
        "orgnNatCd": "KR",
        "pkgUnitCd": "AM",
        "qtyUnitCd": "CA",
        "taxTyCd": "B",
        "btchNo": null,
        "regBhfId": "00",
        "bcd": "8801234567891",
        "dftPrc": 5000,
        "grpPrcL1": 0,
        "grpPrcL2": 0,
        "grpPrcL3": 0,
        "grpPrcL4": 0,
        "grpPrcL5": 0,
        "addInfo": null,
        "sftyQty": 0,
        "isrcAplcbYn": "Y",
        "rraModYn": "N",
        "useYn": "Y"
      }
    ]
  }
}

// Send Item Composition - /saveItemComposition
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226193918",
  "data": null
}
Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	Result Code	String	000
resultMsg	Result Message	String	It is succeeded
resultDt	Result Date	String	20200226193918
tin	Taxpayer Identification Number (PIN)	String	A123456789Z
itemCd	Item Code - unique code assigned to each item. Format: 'Country of Origin''Product Type''Packaging Unit''Quantity Unit''Sequence'	String	KR2AMXBLL0000001
itemClsCd	Item Classification Code	String	1110160600
itemTyCd	Item Type Code - 1-Raw Material, 2-Finished Product, 3-Service without stock	String	2
itemNm	Item Name	String	rest item#1
itemStdNm	Item Standard Name	String	null
orgnNatCd	Origin Nation Code	String	KR
pkgUnitCd	Packaging Unit Code	String	AM
qtyUnitCd	Quantity Unit Code	String	BLL
taxTyCd	Taxation Type Code - A-Exempt, B-16%, C-0%, D-Non-VAT, E-8%	String	B
btchNo	Batch Number	String	null
regBhfId	Registration Branch Office ID	String	00
bcd	Barcode	String	8801234567061
dftPrc	Default Unit Price	Number	21000
grpPrcL1	Group 1 Unit Price	Number	0
grpPrcL2	Group 2 Unit Price	Number	0
grpPrcL3	Group 3 Unit Price	Number	0
grpPrcL4	Group 4 Unit Price	Number	0
grpPrcL5	Group 5 Unit Price	Number	0
addInfo	Additional Information	String	null
sftyQty	Safety Quantity	Number	0
isrcAplcbYn	Insurance Applicable (Y/N)	String	N
rraModYn	KRA (Kenya Revenue Authority) Modify Y/N (Item Classification Code)	String	N
useYn	Used / Unused	String	Y
v. Imported Item Management (Get and Send)
Functionalities in this category allows TIS to receive data of imported items which is declared by the PIN of TIS owner and to send confirmation of the received imported items with the corresponding TIS stock items

NOTE: The imported items data are retrieved from KRA customs system and data can be used for stock adjustment.

Endpoints:

Get imported item information path suffix: /importedItemInfo
Send (converted) imported item information path suffix: /importedItemConvertedInfo
Common Headers for all Basic Data Management APIs:
tin: P051402944X
bhfId: 00
cmcKey: B7294E9830B24224936A6CF86D469773CA858A464C7A4431AEB3
Request Body
// Get imported item information - /selectImportItemList
{
    "lastReqDt": "20190524000000"
}

// Send (converted) imported item information - /updateImportItem
{
    "taskCd": "2231943",
    "dclDe": "20191217",
    "itemSeq": 1,
    "hsCd": "1231531231",
    "itemClsCd": "5022110801",
    "itemCd": "KE1NTXU0000001",
    "imptItemSttsCd": "1",
    "remark": "remark",
    "modrNm": "Admin",
    "modrId": "Admin"
}

Request Parameter Definition
Name	Description	Type	Sample Values
lastReqDt	Last Request Date - Format: YYYYMMDDHHMMSS	String	20190524000000
taskCd	Task Code	String	2231943
dclDe	Declaration Date - Format: YYYYMMDD	String	20191217
itemSeq	Item Sequence	Number	1
hsCd	HS Code - Harmonized System Code, used to classify traded goods	String	1231531231
itemClsCd	Item Classification Code	String	5022110801
itemCd	Item Code - unique code assigned to each item. Format: 'Country of Origin''Product Type''Packaging Unit''Quantity Unit''Sequence'	String	KE1NTXU0000001
imptItemSttsCd	Import Item Status Code - 1-Unsent, 2-Waiting, 3-Approved, 4-Cancelled	String	1
remark	Remark	String	remark
modrNm	Modifier Name	String	Admin
modrId	Modifier ID	String	Admin
Response Body
// Get imported item information - /selectImportItemList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226194118",
  "data": {
    "itemList": [
      {
        "taskCd": "2239078",
        "dclDe": "-1",
        "itemSeq": 1,
        "dclNo": "C3460-2019-TZDL",
        "hsCd": "20055900000",
        "itemNm": "BAKED BEANS",
        "imptItemsttsCd": "2",
        "orgnNatCd": "BR",
        "exptNatCd": "BR",
        "pkg": 2922,
        "pkgUnitCd": null,
        "qty": 19946,
        "qtyUnitCd": "KGM",
        "totWt": 19945.57,
        "netWt": 19945.57,
        "spplrNm": "ODERICH CONSERVA QUALIDADE
BRASIL",
        "agntNm": "BN METRO Ltd",
        "invcFcurAmt": 296865.6,
        "invcFcurCd": "USD",
        "invcFcurExcrt": 929.79
      }
    ]
  }
}

// Send (converted) imported item information - /updateImportItem
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226194253",
  "data": null
}
Response Parameter Definition
Name	Description	Type	Sample Values
taskCd	Task Code	String	2239078
dclDe	Declaration Date - Format: YYYYMMDD	String	-1
itemSeq	Item Sequence	Number	1
dclNo	Declaration Number	String	C3460-2019-TZDL
hsCd	HS Code - Harmonized System Code, used to classify traded goods	String	20055900000
itemNm	Item Name	String	BAKED BEANS
imptItemSttsCd	Import Item Status Code - 1-Unsent, 2-Waiting, 3-Approved, 4-Cancelled	String	2
orgnNatCd	Origin Nation Code	String	BR
exptNatCd	Export Nation Code	String	BR
pkg	Package quantity	Number	2922
pkgUnitCd	Packaging Unit Code	String	null
qty	Quantity	Number	19946
qtyUnitCd	Quantity Unit Code	String	KGM
totWt	Gross Weight	Number	19945.57
netWt	Net Weight	Number	19945.57
spplrNm	Supplier's name	String	ODERICH CONSERVA QUALIDADE BRASIL
agntNm	Agent name	String	BN METRO Ltd
invcFcurAmt	Invoice Foreign Currency Amount	Number	296865.6
invcFcurCd	Invoice Foreign Currency Code	String	USD
invcFcurExcrt	Invoice Foreign Currency Exchange Rate	Number	929.79
vi. Sales Management (Send & Get)
Functionalities in this category allows TIS to send and get sales transaction and invoice information to e-TIMS API Server.

NOTE:

i. Sales transaction data comprises of information such as Customer PIN, Customer Name, Sales Type Code, Receipt Type Code, Payment Type Code, Invoice Status Code, Validated Date, Sale Date, Stock Released Date, Cancel Requested Date, Canceled Date and Refunded Date.

ii. Sales Invoice data comprises of information such as Invoice Number, Current Receipt Number, Total Receipt Number, Customer PIN, Customer Mobile Number, Receipt Published Date, Internal Data and Receipt Signature.

Endpoints:

Save sales transaction information path suffix: /sendSalesTransaction
Select sales transaction path suffix: /selectSalesTransactions
Select Invoice Details path Suffix: /selectInvoiceDetail
Common Headers for all Basic Data Management APIs:
tin: P051402944X
bhfId: 00
cmcKey: B7294E9830B24224936A6CF86D469773CA858A464C7A4431AEB3
Details
Request Body
//Send sales transaction information - /saveTrnsSalesOsdc
{
    "invcNo": 1,
    "orgInvcNo": 0,
    "custTin": "A123456789Z",
    "custNm": "Miriam",
    "salesTyCd": "N",
    "rcptTyCd": "S",
    "pmtTyCd": "01",
    "salesSttsCd": "02",
    "cfmDt": "20210709120300",
    "salesDt": "20230420",
    "stockRlsDt": "20210709120300",
    "cnclReqDt": null,
    "cnclDt": null,
    "rfdDt": null,
    "rfdRsnCd": null,
    "totItemCnt": 2,
    "taxblAmtA": 0,
    "taxblAmtB": 250000,
    "taxblAmtC": 0,
    "taxblAmtD": 0,
    "taxblAmtE": 0,
    "taxRtA": 0,
    "taxRtB": 16,
    "taxRtC": 0,
    "taxRtD": 0,
    "taxRtE": 0,
    "taxAmtA": 0,
    "taxAmtB": 94576,
    "taxAmtC": 0,
    "taxAmtD": 0,
    "taxAmtE": 0,
    "totTaxblAmt": 250000,
    "totTaxAmt": 38135,
    "totAmt": 250000,
    "prchrAcptcYn": "N",
    "remark": null,
    "regrId": "11999",
    "regrNm": "TestVSCU",
    "modrId": "45678",
    "modrNm": "TestVSCU",
    "receipt": {
        "custTin": "A123456789Z",
        "custMblNo": null,
        "rptNo": 1,
        "rcptPbctDt": "20230420124801",
        "trdeNm": "",
        "adrs": "",
        "topMsg": "Shopwithus",
        "btmMsg": "Welcome",
        "prchrAcptcYn": "N"
    },
    "itemList": [
        {
            "itemSeq": 1,
            "itemCd": "KE1NTXU0000001",
            "itemClsCd": "5059690800",
            "itemNm": "OutDoorUnit",
            "bcd": null,
            "pkgUnitCd": "NT",
            "pkg": 1,
            "qtyUnitCd": "U",
            "qty": 1,
            "prc": 200000,
            "splyAmt": 200000,
            "dcRt": 0,
            "dcAmt": 0,
            "isr ccCd": null,
            "isrccNm": null,
            "isrcRt": null,
            "isrcAmt": null,
            "taxTyCd": "B",
            "taxblAmt": 200000,
            "taxAmt": 30508,
            "totAmt": 200000
        },
        {
            "itemSeq": 2,
            "itemCd": "KE1NTXU0000002",
            "itemClsCd": "5022110801",
            "itemNm": "NetworkCable",
            "bcd": null,
            "pkgUnitCd": "NT",
            "pkg": 1,
            "qtyUnitCd": "U",
            "qty": 1,
            "prc": 50000,
            "splyAmt": 50000,
            "dcRt": 0,
            "dcAmt": 0,
            "isrccCd": null,
            "isrccNm": null,
            "isrcRt": null,
            "isrcAmt": null,
            "taxTyCd": "B",
            "taxblAmt": 50000,
            "taxAmt": 7627,
            "totAmt": 50000
        }
    ]
}

Request Parameter Definition
Name	Description	Type	Sample Values
invcNo	Invoice	Number	Number
orgInvcNo	Original Invoice Number	Number	0
custTin	Customer Taxpayer Identification Number (PIN)	String	A123456789Z
custNm	Customer Name	String	Miriam
salesTyCd	Sales Type Code - N-Normal, C-Copy, P-Proforma Invoice, T-Training	String	N
rcptTyCd	Receipt Type Code - S-Sale, R-Credit Note after Sale	String	S
pmtTyCd	Payment Type Code - 01-CASH, 02-CREDIT, 03-CASH/CREDIT, etc. (See source document '4.11 Payment Method' for additional codes)	String	01
salesSttsCd	Invoice Status Code (See source document '4.11 Transaction Progress' for possible values)	String	02
cfmDt	Validated Date - Format: YYYYMMDDHHMMSS	String	20210709120300
salesDt	Sales Date - Format: YYYYMMDD	String	20230420
stockRlsDt	Stock Released Date - Format: YYYYMMDDHHMMSS	String	20210709120300
cnclReqDt	Cancel Requested Date - Format: YYYYMMDDHHMMSS	String	null
cnclDt	Canceled Date - Format: YYYYMMDDHHMMSS	String	null
rfdDt	Credit Note Date - Format: YYYYMMDDHHMMSS	String	null
rfdRsnCd	Credit Note Reason Code (See source document '4.16 Credit Note Reason' for possible values)	String	null
totItemCnt	Total Item Count	Number	2
taxblAmtA	Taxable Amount A	Number	0
taxblAmtB	Taxable Amount B	Number	250000
taxblAmtC	Taxable Amount C	Number	0
taxblAmtD	Taxable Amount D	Number	0
taxblAmtE	Taxable Amount E	Number	0
taxRtA	Tax Rate A	Number	0
taxRtB	Tax Rate B	Number	16
taxRtC	Tax Rate C	Number	0
taxRtD	Tax Rate D	Number	0
taxRtE	Tax Rate E	Number	0
taxAmtA	Tax Amount A	Number	0
taxAmtB	Tax Amount B	Number	94576
taxAmtC	Tax Amount C	Number	0
taxAmtD	Tax Amount D	Number	0
taxAmtE	Tax Amount E	Number	0
totTaxblAmt	Total Taxable Amount	Number	250000
totTaxAmt	Total Tax Amount	Number	38135
totAmt	Total Amount	Number	250000
prchrAcptcYn	Purchaser Acceptance Y/N	String	N
remark	Remark	String	null
regrId	Registration ID	String	11999
regrNm	Registration Name	String	TestVSCU
modrId	Modifier ID	String	45678
modrNm	Modifier Name	String	TestVSCU
rptNo	Report Number	Number	1
rcptPbctDt	receipt Published Date - Format: YYYYMMDDHHMMSS	String	20230420124801
trdeNm	Trade Name	String	
adrs	Address	String	
topMsg	Top Message	String	Shopwithus
btmMsg	Bottom Message	String	Welcome
itemSeq	Item Sequence Number	Number	1
itemCd	Item Code - unique code assigned to each item. Format: 'Country of Origin''Product Type''Packaging Unit''Quantity Unit''Sequence'	String	KE1NTXU0000001
itemClsCd	Item Classification Code	String	5059690800
itemNm	Item Name	String	OutDoorUnit
bcd	Barcode	String	null
pkgUnitCd	Packaging Unit Code	String	NT
pkg	Package	Number	1
qtyUnitCd	Quantity Unit Code	String	U
qty	Quantity	Number	1
prc	Unit Price	Number	200000
splyAmt	Supply Amount	Number	200000
dcRt	Discount Rate	Number	0
dcAmt	Discount Amount	Number	0
isr ccCd	Insurance Company Code	String	null
isrccNm	Insurance Company Name	String	null
isrcRt	Insurance Rate	Number	null
isrcAmt	Insurance Amount	Number	null
taxTyCd	Taxation Type Code - A-Exempt, B-16%, C-0%, D-Non-VAT, E-8%	String	B
taxblAmt	Taxable Amount	Number	200000
taxAmt	Tax Amount	Number	30508
totAmt	Total Amount	Number	200000
Response Body
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226194328",
  "data": {
    "curRcptNo": "1",
    "totRcptNo": "1",
    "intrlData": "EAHSAV6ECUUXSY6PCCJYAUP6MI",
    "rcptSign": "QUII27MATATSHFRB",
    "sdcDateTime": "20210502115145"
  }
}

Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	Result Code	String	000
resultMsg	Result Message	String	It is succeeded
resultDt	Result Date Time - Format: YYYYMMDDHHMMSS	String	20200226194328
curRcptNo	Current Receipt Number	String	1
totRcptNo	Total Receipt Number	String	1
intrlData	Internal Data	String	EAHSAV6ECUUXSY6PCCJYAUP6MI
rcptSign	Receipt Signature	String	QUII27MATATSHFRB
sdcDateTime	Sales Device Control Unit Date Time - Format: YYYYMMDDHHMMSS	String	20210502115145
vii. Purchase Transaction Management (Get and Send)
The functionalities in this category allows TIS to get purchase transaction(s) and Invoice data from eTIMS Server with the PIN of TIS owner. It also allows for confirmation of the purchases by the TIS owner for stock adjustment purposes.

Endpoints:

Get purchase transaction information path suffix: /getPurchaseTransactionInfo
Send purchase transaction information path suffix: /sendPurchaseTransactionInfo
Common Headers for all Basic Data Management APIs:**
tin: P051402944X
bhfId: 00
cmcKey: B7294E9830B24224936A6CF86D469773CA858A464C7A4431AEB3
Request Body
// Get purchase transaction information - /selectTrnsPurchaseSalesList
{
    "lastReqDt": "20190524000000"
}

// Send purchase transaction information - /insertTrnsPurchase
{
    "invcNo": 1,
    "orgInvcNo": 0,
    "spplrTin": null,
    "spplrBhfId": null,
    "spplrNm": null,
    "spplrInvcNo": null,
    "regTyCd": "M",
    "pchsTyCd": "N",
    "rcptTyCd": "P",
    "pmtTyCd": "01",
    "pchsSttsCd": "02",
    "cfmDt": "20230420133104",
    "pchsDt": "20230417",
    "wrhsDt": "",
    "cnclReqDt": "",
    "cnclDt": "",
    "rfdDt": "",
    "totItemCnt": 1,
    "taxblAmtA": 0,
    "taxblAmtB": 5000,
    "taxblAmtC": 0,
    "taxblAmtD": 0,
    "taxblAmtE": 0,
    "taxRtA": 0,
    "taxRtB": 16,
    "taxRtC": 0,
    "taxRtD": 0,
    "taxRtE": 0,
    "taxAmtA": 0,
    "taxAmtB": 94576,
    "taxAmtC": 0,
    "taxAmtD": 0,
    "taxAmtE": 0,
    "totTaxblAmt": 5000,
    "totTaxAmt": 689.66,
    "totAmt": 5000,
    "remark": null,
    "regrNm": "Admin",
    "regrId": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin",
    "itemList": [
        {
            "itemSeq": 1,
            "itemCd": "DZ2BRXCAX0000001",
            "itemClsCd": "5012161100",
            "itemNm": "Shell Fish",
            "bcd": "",
            "spplrItemClsCd": null,
            "spplrItemCd": null,
            "spplrItemNm": null,
            "pkgUnitCd": "BR",
            "pkg": 0,
            "qtyUnitCd": "CA",
            "qty": 1,
            "prc": 5000,
            "splyAmt": 5000,
            "dcRt": 0,
            "dcAmt": 0,
            "taxblAmt": 5000,
            "taxTyCd": "B",
            "taxAmt": 689.66,
            "totAmt": 5000,
            "itemExprDt": null
        }
    ]
}

Request Parameter Definition
Name	Description	Type	Sample Values
lastReqDt	Last Request Date - Format: YYYYMMDDHHMMSS	String	20190524000000
invcNo	Invoice Number	Number	1
orgInvcNo	Original Invoice Number	Number	0
spplrTin	Supplier PIN	String	A123456789Z
spplrBhfId	Supplier Branch ID	String	00
spplrNm	Supplier Name	String	Taxpayer1111
spplrInvcNo	Supplier Invoice Number	Number	2
regTyCd	Registration Type Code - See '4.12. Registration Type Code'	String	M
pchsTyCd	Purchase Type Code - See '4.8. Transaction Type'	String	N
rcptTyCd	Receipt Type Code - See '4.13. Purchase Receipt Type'	String	P
pmtTyCd	Payment Type Code - See '4.10. Payment Method'	String	01
pchsSttsCd	Purchase Status Code - See '4.11. Transaction Progress'	String	02
cfmDt	Validated Date - Format: YYYYMMDDHHMMSS	String	20230420133104
pchsDt	Purchase Date - Format: YYYYMMDD	String	20230417
wrhsDt	Warehousing Date - Format: YYYYMMDDHHMMSS	String	
cnclReqDt	Cancel Requested Date - Format: YYYYMMDDHHMMSS	String	
cnclDt	Canceled Date - Format: YYYYMMDDHHMMSS	String	
rfdDt	Credit Note Date - Format: YYYYMMDDHHMMSS	String	
totItemCnt	Total Item Count	Number	1
taxblAmtA	Taxable Amount A	Number	0
taxblAmtB	Taxable Amount B	Number	5000
taxblAmtC	Taxable Amount C	Number	0
taxblAmtD	Taxable Amount D	Number	0
taxblAmtE	Taxable Amount E	Number	0
taxRtA	Tax Rate A	Number	0
taxRtB	Tax Rate B	Number	16
taxRtC	Tax Rate C	Number	0
taxRtD	Tax Rate D	Number	0
taxRtE	Tax Rate E	Number	0
taxAmtA	Tax Amt A	Number	0
taxAmtB	Tax Amt B	Number	94576
taxAmtC	Tax Amt C	Number	0
taxAmtD	Tax Amt D	Number	0
taxAmtE	Tax Amt E	Number	0
totTaxblAmt	Total Taxable Amount	Number	5000
totTaxAmt	Total Tax Amount	Number	689.66
totAmt	Total Amount	Number	5000
remark	Remark	String	
regrNm	Registration Name	String	Admin
regrId	Registration ID	String	Admin
modrNm	Modifier Name	String	Admin
modrId	Modifier ID	String	Admin
itemSeq	Item Sequence Number	Number	1
itemCd	Item Code - See '4.18. Item code'	String	DZ2BRXCAX0000001
itemClsCd	Item Classification Code	String	5012161100
itemNm	Item Name	String	Shell Fish
bcd	Barcode	String	
spplrItemClsCd	Supplier Item Classification Code	String	
spplrItemCd	Supplier Item Code	String	
spplrItemNm	Supplier Item Name	String	
pkgUnitCd	Packaging Unit Code- See '4.5. Packaging Unit'	String	BR
pkg	Package	Number	0
qtyUnitCd	Quantity Unit Code - See '4.6. Unit of Quantity'	String	CA
qty	Quantity	Number	1
prc	Unit Price	Number	5000
splyAmt	Supply Amount	Number	5000
dcRt	Discount Rate	Number	0
dcAmt	Discount Amount	Number	0
taxblAmt	Taxable Amount	Number	5000
taxTyCd	Taxation Type Code - See '4.1. Tax Type'	String	B
taxAmt	Tax Amount	Number	689.66
totAmt	Total Amount	Number	5000
itemExprDt	Item Expired Date - Format: YYYYMMDD	String	
Response Body
// Get purchase transaction information - /selectTrnsPurchaseSalesList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226195420",
  "data": {
    "saleList": [
      {
        "spplrTin": "A123456789Z",
        "spplrNm": "Taxpayer1111",
        "spplrBhfId": "00",
        "spplrInvcNo": 2,
        "rcptTyCd": "S",
        "pmtTyCd": "01",
        "cfmDt": "2020-01-27 21:03:00",
        "salesDt": "20200127",
        "stockRlsDt": "2020-01-27 21:03:00",
        "totItemCnt": 2,
        "taxblAmtA": 0,
        "taxblAmtB": 10500,
        "taxblAmtC": 0,
        "taxblAmtD": 0,
        "taxblAmtE": 0,
        "taxRtA": 0,
        "taxRtB": 18,
        "taxRtC": 0,
        "taxRtD": 0,
        "taxRtE": 0,
        "taxAmtA": 0,
        "taxAmtB": 1602,
        "taxAmtC": 0,
        "taxAmtD": 0,
        "taxAmtE": 0,
        "totTaxblAmt": 10500,
        "totTaxAmt": 1602,
        "totAmt": 10500,
        "remark": null,
        "itemList": [
          {
            "itemSeq": 1,
            "itemCd": "KE1NTXU0000001",
            "itemClsCd": "5059690800",
            "itemNm": "test item 1",
            "bcd": null,
            "pkgUnitCd": "NT",
            "pkg": 2,
            "qtyUnitCd": "U",
            "qty": 2,
            "prc": 3500,
            "splyAmt": 7000,
            "dcRt": 0,
            "dcAmt": 0,
            "taxTyCd": "B",
            "taxblAmt": 7000,
            "taxAmt": 1068,
            "totAmt": 7000
          },
          {
            "itemSeq": 2,
            "itemCd": "KE1NTXU0000002",
            "itemClsCd": "5022110801",
            "itemNm": "test item 2",
            "bcd": null,
            "pkgUnitCd": "NT",
            "pkg": 1,
            "qtyUnitCd": "U",
            "qty": 1,
            "prc": 3500,
            "splyAmt": 3500,
            "dcRt": 0,
            "dcAmt": 0,
            "taxTyCd": "B",
            "taxblAmt": 3500,
            "taxAmt": 534,
            "totAmt": 3500
          }
        ]
      }
    ]
  }
}

// Send purchase transaction information - /insertTrnsPurchase
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226194650",
  "data": null
}
Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	Result Code	String	000
resultMsg	Result Message	String	It is succeeded
resultDt	Result Date - Format: YYYYMMDDHHMMSS	String	20200226195420
spplrTin	Supplier PIN	String	A123456789Z
spplrNm	Supplier Name	String	Taxpayer1111
spplrBhfId	Supplier Branch ID	String	00
spplrInvcNo	Supplier Invoice Number	Number	2
rcptTyCd	Receipt Type Code - See '4.9. Sales Receipt Type'	String	S
pmtTyCd	Payment Type Code - See '4.10. Payment Method'	String	01
cfmDt	Validated Date - Format: YYYY-MM-DD HH24:MI:SS	String	2020-01-27 21:03:00
salesDt	Sale Date - Format: YYYYMMDD	String	20200127
stockRlsDt	Stock Released Date - Format: YYYY-MM-DD HH24:MI:SS	String	2020-01-27 21:03:00
totItemCnt	Total Item Count	Number	2
taxblAmtA	Taxable Amount A	Number	0
taxblAmtB	Taxable Amount B	Number	10500
taxblAmtC	Taxable Amount C	Number	0
taxblAmtD	Taxable Amount D	Number	0
taxblAmtE	Taxable Amount E	Number	0
taxRtA	Tax Rate A	Number	0
taxRtB	Tax Rate B	Number	18
taxRtC	Tax Rate C	Number	0
taxRtD	Tax Rate D	Number	0
taxRtE	Tax Rate E	Number	0
taxAmtA	Tax Amt A	Number	0
taxAmtB	Tax Amt B	Number	1602
taxAmtC	Tax Amt C	Number	0
taxAmtD	Tax Amt D	Number	0
taxAmtE	Tax Amt E	Number	0
totTaxblAmt	Total Taxable Amount	Number	10500
totTaxAmt	Total Tax Amount	Number	1602
totAmt	Total Amount	Number	10500
remark	Remark	String	
itemSeq	Item Sequence Number	Number	1
itemCd	Item Code - See '4.18. Item code'	String	KE1NTXU0000001
itemClsCd	Item Classification Code	String	5059690800
itemNm	Item Name	String	test item 1
bcd	Barcode	String	
pkgUnitCd	Packaging Unit Code - See '4.5. Packaging Unit'	String	NT
pkg	Package	Number	2
qtyUnitCd	Quantity Unit Code - See '4.6. Unit of Quantity'	String	U
qty	Quantity	Number	2
prc	Unit Price	Number	3500
splyAmt	Supply Amount	Number	7000
dcRt	Discount Rate	Number	0
dcAmt	Discount Amount	Number	0
taxTyCd	Taxation Type Code - See '4.1. Tax Type'	String	B
taxblAmt	Taxable Amount	Number	7000
taxAmt	Tax Amount	Number	1068
totAmt	Total Amount	Number	7000
viii. Stock Management (Get and Send)
The functionality in this category allows TIS to send inventory in & out of the branches and update the stock status by item classification to eTIMS Server. It also provides for request of stock from main branch.

NOTE: For implementation purposes, the categories and actions listed in the table below are ordered sequentially meaning that latter actions are dependent on some of the preceding actions.

Endpoints:

Get MoveList path suffix: /selectStockMoveLists
Send Stock Information path suffix: /insert/stockIO
Stock Master Save Requestpath suffix: /save/stockMaster
Common Headers for all Basic Data Management APIs:
tin: P051402944X
bhfId: 00
cmcKey: B7294E9830B24224936A6CF86D469773CA858A464C7A4431AEB3
Request Body
// Get Moves List - /selectStockMoveList
{
    "lastReqDt": "20180524000000"
}

// Send Stock Information - /insertStockIO
{
    "sarNo": 2,
    "orgSarNo": 2,
    "regTyCd": "M",
    "custTin": null,
    "custNm": null,
    "custBhfId": null,
    "sarTyCd": "11",
    "ocrnDt": "20200126",
    "totItemCnt": 2,
    "totTaxblAmt": 70000,
    "totTaxAmt": 12000,
    "totAmt": 70000,
    "remark": null,
    "regrId": "Admin",
    "regrNm": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin",
    "itemList": [
        {
            "itemSeq": 1,
            "itemCd": "KE1NTXU0000001",
            "itemClsCd": "5059690800",
            "itemNm": "testitem1",
            "bcd": null,
            "pkgUnitCd": "BZ",
            "pkg": 10,
            "qtyUnitCd": "U",
            "qty": 10,
            "itemExprDt": null,
            "prc": 3500,
            "splyAmt": 35000,
            "totDcAmt": 0,
            "taxblAmt": 35000,
            "taxTyCd": "B",
            "taxAmt": 6000,
            "totAmt": 35000
        },
        {
            "itemSeq": 2,
            "itemCd": "KE1NTXU0000002",
            "itemClsCd": "5059690800",
            "itemNm": "test item2",
            "bcd": null,
            "pkgUnitCd": "BZ",
            "pkg": 10,
            "qtyUnitCd": "U",
            "qty": 10,
            "itemExprDt": null,
            "prc": 3500,
            "splyAmt": 35000,
            "totDcAmt": 0,
            "taxblAmt": 35000,
            "taxTyCd": "B",
            "taxAmt": 6000,
            "totAmt": 35000
        }
    ]
}

// Stock Master Save Request - /saveStockMaster
{
    "itemCd": "KE1NTXU0000010",
    "rsdQty": 10,
    "regrId": "Admin",
    "regrNm": "Admin",
    "modrNm": "Admin",
    "modrId": "Admin"
}
Request Parameter Definition
Name	Description	Type	Sample Values
lastReqDt	Last Request Date - should be replaced with the actual Last Request Date in the format YYYYMMDDHHMMSS.	String	20180524000000
sarNo	Stored and released Number	Number	2
orgSarNo	Original Stored and released Number	Number	2
regTyCd	Registration Type Code - See '4.12. Transaction Progress'	String	M
custTin	Customer PIN	String	
custNm	Customer Name	String	
custBhfId	Customer BHF ID	String	
sarTyCd	Stored and released Type Code - See '4.14 Stock In/Out'	String	11
ocrnDt	Occurred Date time - Format: YYYYMMDD	String	20200126
totItemCnt	Total Item Count	Number	2
totTaxblAmt	Total Supply Price	Number	70000
totTaxAmt	Total VAT	Number	12000
totAmt	Total Amount	Number	70000
remark	Remark	String	
regrId	Registration ID	String	Admin
regrNm	Registration Name	String	Admin
modrNm	Modifier Name	String	Admin
modrId	Modifier ID	String	Admin
itemSeq	Item Sequence	Number	Number 1
itemCd	Item Code	String	KE1NTXU0000001
itemClsCd	Item Class Code	String	5059690800
itemNm	Item Name	String	testitem1
bcd	Barcode	String	
pkgUnitCd	Package unit code - See '4.5. Packaging Unit'	String	BZ
pkg Package	Quantity	Number	10
qtyUnitCd	Unit Quantity Code - See '4.5. Packaging Unit'	String	U
qty	Unit Quantity	Number	10
itemExprDt	Item Expired Date	String	
prc Unit	Price	Number	3500
splyAmt	Supply Amount	Number	35000
totDcAmt	Discount Amount	Number	0
taxblAmt	Taxable Amount	Number	35000
taxTyCd	Taxation Type Code - See '4.1 Tax Type	String	B
taxAmt	Tax Amount	Number	6000
totAmt	Total Amount	Number	35000
Response Body
// Get Moves List - /selectStockMoveList
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226200723",
  "data": {
    "stockList": [
      {
        "custTin": "A123456789Z",
        "custBhfId": "00",
        "sarNo": 6,
        "ocrnDt": "20200120",
        "totItemCnt": 1,
        "totTaxblAmt": 1800000,
        "totTaxAmt": 274576.27,
        "totAmt": 1800000,
        "remark": null,
        "itemList": [
          {
            "itemSeq": 1,
            "itemCd": "KR2BZX0000001",
            "itemClsCd": "1110162100",
            "itemNm": "Grocery_Item#1",
            "bcd": "8801234567051",
            "pkgUnitCd": "BZ",
            "pkg": 0,
            "qtyUnitCd": "CA",
            "qty": 450,
            "itemExprDt": null,
            "prc": 4000,
            "splyAmt": 1800000,
            "totDcAmt": 0,
            "taxblAmt": 1800000,
            "taxTyCd": "B",
            "taxAmt": 274576.27,
            "totAmt": 1800000
          }
        ]
      },
      {
        "custTin": "A123456789Z",
        "custBhfId": "00",
        "sarNo": 59,
        "ocrnDt": "20200110",
        "totItemCnt": 1,
        "totTaxblAmt": 660000,
        "totTaxAmt": 100677.97,
        "totAmt": 660000,
        "remark": null,
        "itemList": [
          {
            "itemSeq": 1,
            "itemCd": "KR2AMXCRX0000001",
            "itemClsCd": "1110151600",
            "itemNm": "sample_nudle#1",
            "bcd": "8801234567001",
            "pkgUnitCd": "AM",
            "pkg": 0,
            "qtyUnitCd": "CR",
            "qty": 600,
            "itemExprDt": null,
            "prc": 1100,
            "splyAmt": 660000,
            "totDcAmt": 0,
            "taxblAmt": 660000,
            "taxTyCd": "B",
            "taxAmt": 100677.97,
            "totAmt": 660000
          }
        ]
      }
    ]
  }
}

// Send Stock Information - /insertStockIO
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226195801",
  "data": null
}

// Stock Master Save Request - /saveStockMaster
{
  "resultCd": "000",
  "resultMsg": "It is succeeded",
  "resultDt": "20200226195801",
  "data": null
}

Response Parameter Definition
Name	Description	Type	Sample Values
resultCd	This is the result code returned by the server. '000' signifies a successful request while other codes indicate various error conditions on the errors tab.	String	000
resultMsg	This provides a human-readable message corresponding to the 'resultCd'.For example, 'It is succeeded' confirms the success of the request. [1, 2]	String	It is succeeded
resultDt	This element records the date and time the response was generated by the server. It follows the format 'YYYYMMDDHHMMSS'. [2]	String	20200226200723
data	This object encapsulates the specific data returned by the API function. The structure and content within 'data' will vary based on the function called and the nature of the request. [3]	Object	{}
⬆ Back to Contents

3. TESTING
F. Begin Automated App testing on Developer Platform
Once you have created your app using the OSCU API, you can proceed to run automated tests on the Developer Platform. During this step, you will test your application to ensure it is working as expected and complies with the required technical standards. After completing the tests successfully, you will be ready to move on to the next stage of the process. For more details on how automated app testing works, including test cases and common errors, click here to view the Automated Testing guide.

G. Successfully complete Automated App Test
Verification Notification (Successful Automated App Test)
After successfully completing the automated app tests, you will receive a verification notification through the Developer Portal confirming that your test has passed.

Note that KRA will verify the automated testing results based on the submitted test artefacts.
Verification Notification (Unsuccessful Automated App Test)
If the automated app test is unsuccessful, you will receive a notification through the Developer Portal indicating that the test did not pass. You should then review the detailed test results provided in the portal to clearly understand where the system failed to meet the required endpoint integration standards.
Based on this feedback, make the necessary corrections and improvements to your system, and once the changes have been implemented, you can schedule and conduct a new Automated App Test.
H. Upload Automated App Test artefacts
Once the automated app testing is completed successfully, you will upload the following artefacts to the Developer Platform:
Item Creation Screenshot
Invoice Generation Screenshot
Invoice Copy
Credit Note Copy
Note: Ensure all artefacts are uploaded within one hour of completing the automated app test to avoid delays in the verification process.

⬆ Back to Contents

4. KYC DOCUMENTATION
I. Upload go-live KYC documents
After completing the automated app testing, you will be required to provide the requested information and documentation for verification. At this stage, you will also review and agree to the Terms of Use. Below are the required KYC documents:
eTIMS Bio Data Form
Business Registration Documents - (Certificate of Incorporation/ Business Registration Certificate & CR12)
Business Permit
National ID for directors/ partners/ sole proprietor
Company/ Business Tax Compliance Certificates
Proof of at least three qualified technical staff handling system development and system administration.
Notarized declaration by the Third-Party Vendor that they are not insolvent, in receivership, bankrupt, or being wound up.
Technology Architecture documentation of how integration between Trader Invoicing System (TIS) and eTIMS will take place.
Note: If you are a self-integrator, you are only required to provide items 1, 5, 6, and 8 from the list above.
⬆ Back to Contents

5. VERIFICATION
J. Schedule verification meeting
Next, schedule a verification meeting by submitting your proposed date and time. You will receive an email acknowledging your submission, but note that the meeting date is subject to KRA’s approval. Wait for confirmation of the approved date and time before proceeding, and attend the meeting once the approval is received.

K. Artefact Verification (Pre-Demo)
KRA will review and verify the artefacts you uploaded before the demo session. If the verification is unsuccessful, you will receive a notification along with KRA’s remarks and any administrative comments. Review this feedback carefully, make the necessary corrections to meet the required endpoint integration standards, and then schedule a new Automated App Test once the changes are implemented.

L. Verification Meeting Approval / Reschedule
You will receive an email confirming whether your verification meeting has been approved or rescheduled.

i. Verification Meeting Approval
Once your verification meeting is approved, you will receive an email confirming the demo session date and time. Review the meeting details carefully and prepare to attend using the provided information. Make sure all required system components and supporting materials are ready for the demo.

ii. Verification Meeting Rescheduling
If KRA requests to reschedule your demo session, you will receive an email with the details. Use the provided portal link to select and submit a new convenient date and time, and then wait for confirmation of the rescheduled session before proceeding.

M. Joint Verification Meeting (Demo) and Feedback
Attend the joint verification demo meeting with KRA at the scheduled date and time. During the session, demonstrate your system’s functionality for the following verification areas:

Invoice data database
Credit note database
Invoice format
Credit note format
Item creation process screenshots
Invoice generation screenshots
Demo Verification Failure Notification
If your system fails the joint verification demo, you will receive an email outlining the failed use cases. Review the remarks carefully, identify where the system did not meet the required endpoint integration standards, and make the necessary corrections. Once the adjustments are implemented, schedule a new Automated App Test.
N. KYC Document Review and Feedback
KRA will review the KYC documents you submitted. If they do not meet the minimum standards, you will receive an email with verification remarks. Review the feedback, correct the highlighted issues, and re-upload the updated documents to the portal for re-evaluation.

O. KYC Document Verification Confirmation
Once everything meets the required standards, you will receive a confirmation notification. At this point, ensure that no further corrections are needed before moving on to the next steps.

P. Sample SLA and Next Steps Notification
Third-Party Integrators – SLA Execution
Once your KYC documents are successfully verified, you will receive a Sample SLA and an information template through the Developer Portal. Review the SLA carefully, noting all terms and responsibilities, and follow the next steps outlined in the template. Make sure the authorized company personnel details are accurately captured in the eTIMS Bio Data Form
If there are any updates or changes, update the form and send the completed copy to timsupport@kra.go.ke with the subject: “SLA Execution with KRA - {Name of Company}”.
Note:

Your company will be added to the integrator list once the SLA is executed and approved.
For third-party integrators, the SLA execution is conducted outside the system.
Self-Integrators – Document Review
If your documents meet the required standards, you will receive an interim approval letter.

Note: No SLA execution is required for self-integrators.
Q. SLA Upload and App Production Approval
Once the signed Service Level Agreement (SLA) is uploaded to the system, you will receive a confirmation that it has been successfully approved. After this, KRA will approve your application for production implementation.

R. Developer Approval / Rejection Notification
Approval Notification
You will receive a notification specifying whether you are recognized as a third-party integrator or self-integrator based on your registration. The notification will also include the name and version of the software that successfully passed User Acceptance Testing (UAT).

Note: This approval allows you to proceed with system deployment and other production activities as authorized by KRA.
Rejection Notification
If your application is rejected by KRA, you will receive a notification outlining the reasons for rejection. Review the feedback carefully to identify where the system or documentation did not meet KRA requirements. Make the necessary corrections, and then resubmit the application for re-evaluation once all issues have been addressed.

⬆ Back to Contents

6. GO LIVE
S. Production Keys Availability
You will be provided with production keys through the developer portal. Make sure to store them securely and handle them carefully, using the keys only in the authorized production environment.

T. Go-Live Deployment
After receiving the production keys, proceed with the go-live deployment of your system. Verify that it is fully functional and operational in the live environment, and monitor it post-deployment to ensure stability and compliance with KRA requirements.

⬆ Back to Contents

Use cases
Use cases are used to demonstrate and validate key system functions during testing and verification.

⬆ Back to Contents

product

APIs
Documentation
Developer Market
My Apps
support

Contact Support
FAQs
legal

Privacy Policy
Terms & Conditions
Join our newsletter mailing list

Enter your email here

Location

Times Tower, Haile Selassie Avenue,
P.O. Box 48240 - 00100 GPO
Nairobi Email: apisupport@kra.go.ke

Government of Kenya 2026 Copyright. All rights reserved.

Back To Top

Gavaconnect - Developers' Portal