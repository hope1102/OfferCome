(function initDefaults(global) {
  const OfferCome = global.OfferCome = global.OfferCome || {};

  OfferCome.STORAGE_KEYS = {
    profile: "offercome.profile",
    settings: "offercome.settings",
    siteRules: "offercome.siteRules",
    applications: "offercome.applications"
  };

  OfferCome.createDefaultProfile = function createDefaultProfile() {
    return {
      schemaVersion: 1,
      updatedAt: null,
      basics: {
        fullName: "",
        englishName: "",
        gender: "",
        birthDate: "",
        nationality: "中国",
        ethnicity: "",
        politicalStatus: "",
        maritalStatus: "",
        healthStatus: "",
        phone: "",
        alternatePhone: "",
        email: "",
        alternateEmail: "",
        idType: "身份证",
        idNumber: "",
        nativePlace: "",
        sourcePlace: "",
        birthPlace: "",
        hukou: "",
        preCollegeHukou: "",
        currentProvince: "",
        currentCity: "",
        currentDistrict: "",
        address: "",
        postalCode: "",
        wechat: "",
        qq: "",
        website: "",
        github: "",
        linkedin: "",
        portfolio: "",
        targetCity: "",
        targetPosition: "",
        expectedSalary: "",
        availableDate: "",
        summary: "",
        strengths: "",
        hobbies: ""
        ,domesticGraduate: ""
        ,hongKongMacaoUniversityStudent: ""
        ,taiwanRegisteredUniversityStudent: ""
        ,scienceEngineeringMajor: ""
        ,engineeringMasterDoctorProgram: ""
      },
      education: [],
      experience: [],
      projects: [],
      campus: [],
      skills: [],
      languages: [],
      certificates: [],
      awards: [],
      publications: [],
      family: [],
      answers: {
        careerPlan: "",
        whyCompany: "",
        strengthsAndWeaknesses: "",
        acceptOvertime: "",
        acceptTravel: "",
        acceptRelocation: "",
        relativesInCompany: "",
        source: ""
      }
    };
  };

  OfferCome.createDefaultSettings = function createDefaultSettings() {
    return {
      overwriteExisting: false,
      minimumConfidence: 0.62,
      highlightResults: true,
      fillSensitiveFields: false
    };
  };
})(globalThis);
