// config/checkFormSchema.js
const CHECK_FORM_SCHEMA = {
  "National ID Verification": {
    _self: [
      { name: "aadhaar", label: "Aadhaar Number" },
      { name: "pan", label: "PAN Number" },
      { name: "passport", label: "Passport Number" },
      { name: "voter", label: "Voter ID Number" },
      { name: "drivingLicence", label: "Driving Licence Number" },
      {
        name: "_file",
        label: "Upload ID Document (Aadhaar/PAN/Any)",
        type: "file",
      },
    ],
  },

  "Address Verification": {
    "Current Address": [
      { name: "line1", label: "Address Line 1" },
      { name: "line2", label: "Address Line 2" },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "pincode", label: "Pincode" },
      {
        name: "_file_current",
        label: "Upload Current Address Proof",
        type: "file",
      },
    ],
    "Permanent Address": [
      { name: "line1", label: "Address Line 1" },
      { name: "line2", label: "Address Line 2" },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "pincode", label: "Pincode" },
      {
        name: "_file_permanent",
        label: "Upload Permanent Address Proof",
        type: "file",
      },
    ],
  },

  "Employment Verification": {
    "Current Employment": [
      { name: "organization", label: "Organization Name" },
      { name: "designation", label: "Designation" },
      { name: "tenure", label: "Tenure" },
      {
        name: "_file_current",
        label: "Upload Current Employment Proof",
        type: "file",
      },
    ],
    "Previous Employment": [
      { name: "organization", label: "Organization Name" },
      { name: "designation", label: "Designation" },
      { name: "tenure", label: "Tenure" },
      {
        name: "_file_previous",
        label: "Upload Previous Employment Proof",
        type: "file",
      },
    ],
  },

  "Education Verification": {
    _self: [
      { name: "university", label: "University" },
      { name: "degree", label: "Degree" },
      { name: "year", label: "Year of Passing" },
      { name: "_file", label: "Upload Certificate / Transcript", type: "file" },
    ],
  },

  "Court Record Check": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "fatherName", label: "Father's Name" },
      { name: "address", label: "Address" },
      { name: "dob", label: "Date of Birth", type: "date" },
    ],
  },

  "Police Verification": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "address", label: "Address" },
      { name: "dob", label: "Date of Birth", type: "date" },
    ],
  },

  "Reference Checks": {
    "Professional Reference": [
      { name: "refName", label: "Referee Name" },
      { name: "refEmail", label: "Referee Email" },
      { name: "refPhone", label: "Referee Contact Number" },
      { name: "refDesignation", label: "Referee Designation" },
    ],
    "Personal Reference": [
      { name: "name", label: "Name" },
      { name: "phone", label: "Contact Number" },
      { name: "relation", label: "Relation" },
    ],
  },

  "Global Database": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "address", label: "Address" },
      { name: "_file", label: "Upload Supporting Document", type: "file" },
    ],
  },

  "Gap Analysis": {
    _self: [
      { name: "from", label: "From (MM/YYYY)" },
      { name: "to", label: "To (MM/YYYY)" },
      { name: "reason", label: "Reason" },
    ],
  },

  "Credit History Check": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "address", label: "Address" },
      { name: "dob", label: "Date of Birth", type: "date" },
      { name: "_file", label: "Upload Credit Report", type: "file" },
    ],
  },

  UAN: {
    _self: [
      { name: "uan", label: "UAN Number or Aadhaar" },
      { name: "_file", label: "Upload UAN Proof", type: "file" },
    ],
  },

  "Social Media Screening": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "handles", label: "Social Handles (comma separated)" },
    ],
  },

  "Directorship Check": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "pan", label: "PAN Number" },
      { name: "aadhaar", label: "Aadhaar Number" },
      { name: "dob", label: "Date of Birth", type: "date" },
    ],
  },

  "Drug Panel Tests": {
    _self: [
      { name: "candidateName", label: "Candidate Name" },
      { name: "contactNumber", label: "Contact Number" },
      {
        name: "panel",
        label: "Panel (5/6/7/8/9/10/11/12)",
        type: "radio",
        options: ["5", "6", "7", "8", "9", "10", "11", "12"],
      },
    ],
  },
};

export default CHECK_FORM_SCHEMA;
