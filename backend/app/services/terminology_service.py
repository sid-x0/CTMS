from typing import Dict, Any, List
from fastapi import HTTPException
from app.schemas.compliance import TerminologyMappingRequest, TerminologyMappingResponse
from app.models.study import Study
from app.models.site import Site

# Demonstration mapping dictionary for Ayurveda clinical concepts -> Standardized Terminology
TERMINOLOGY_DB: Dict[str, Dict[str, Any]] = {
    "aruchi": {
        "interpretation": "Loss of Appetite / Anorexia",
        "standard_code": "10002554 - Decreased appetite (MedDRA LLT)",
        "confidence": 92,
        "alternatives": ["Anorexia", "Dysgeusia", "Early satiety"]
    },
    "kasa": {
        "interpretation": "Cough / Bronchial Irritation",
        "standard_code": "10011224 - Cough (MedDRA PT)",
        "confidence": 95,
        "alternatives": ["Productive cough", "Upper respiratory tract congestion"]
    },
    "jwara": {
        "interpretation": "Pyrexia / Fever",
        "standard_code": "10037660 - Pyrexia (MedDRA PT)",
        "confidence": 96,
        "alternatives": ["Hyperthermia", "Febrile response"]
    },
    "shwasa": {
        "interpretation": "Dyspnea / Shortness of Breath",
        "standard_code": "10013968 - Dyspnoea (MedDRA PT)",
        "confidence": 89,
        "alternatives": ["Wheezing", "Bronchospasm"]
    },
    "sandhigata vata": {
        "interpretation": "Osteoarthritis / Joint Inflammation",
        "standard_code": "10030563 - Osteoarthritis (MedDRA PT)",
        "confidence": 94,
        "alternatives": ["Arthralgia", "Joint stiffness"]
    },
    "yakrit roga": {
        "interpretation": "Hepatic Dysfunction / Transaminase Elevation",
        "standard_code": "10019688 - Hepatic enzyme increased (MedDRA PT)",
        "confidence": 88,
        "alternatives": ["Hepatotoxicity", "Hyperbilirubinemia"]
    }
}

class TerminologyService:
    @staticmethod
    def suggest_mapping(req: TerminologyMappingRequest) -> TerminologyMappingResponse:
        term_clean = req.ayurveda_term.strip().lower()
        
        mapping = TERMINOLOGY_DB.get(term_clean)
        if not mapping:
            # Fallback for unrecognized term
            return TerminologyMappingResponse(
                input_term=req.ayurveda_term,
                suggested_interpretation="General Clinical Symptom",
                standardized_code="10000001 - Unspecified Symptom (MedDRA)",
                coding_system="MedDRA Aligned",
                confidence_percentage=70,
                alternative_terms=["Adverse event unclassified"]
            )

        return TerminologyMappingResponse(
            input_term=req.ayurveda_term,
            suggested_interpretation=mapping["interpretation"],
            standardized_code=mapping["standard_code"],
            coding_system="MedDRA / SNOMED CT Aligned",
            confidence_percentage=mapping["confidence"],
            alternative_terms=mapping["alternatives"]
        )

    @staticmethod
    def export_fhir_research_study(study: Study, sites: List[Site]) -> Dict[str, Any]:
        """
        Exports an HL7 FHIR R4 ResearchStudy resource object.
        """
        return {
            "resourceType": "ResearchStudy",
            "id": f"aiia-study-{study.id}",
            "identifier": [
                {
                    "use": "official",
                    "system": "http://ctri.nic.in",
                    "value": study.protocol_number
                }
            ],
            "title": study.title,
            "status": study.status.lower().replace(" ", "-"),
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://hl7.org/fhir/research-study-category",
                            "code": study.study_type.lower()
                        }
                    ]
                }
            ],
            "focus": [
                {
                    "text": study.intervention_type
                }
            ],
            "principalInvestigator": {
                "display": study.principal_investigator
            },
            "sponsor": {
                "display": study.sponsor
            },
            "enrollment": [
                {
                    "display": f"Target: {study.target_enrollment}, Actual: {study.current_enrollment}"
                }
            ],
            "site": [
                {
                    "display": f"{s.site_code} - {s.site_name} ({s.location})"
                }
                for s in sites
            ]
        }

    @staticmethod
    def export_cdisc_sdtm(study: Study) -> Dict[str, Any]:
        """
        Exports a CDISC SDTM TS (Trial Summary) dataset JSON structure.
        """
        return {
            "dataset": "TS",
            "standard": "CDISC SDTM v3.3",
            "records": [
                {"STUDYID": study.protocol_number, "TSPARMCD": "TITLE", "TSVAL": study.title},
                {"STUDYID": study.protocol_number, "TSPARMCD": "SPONSOR", "TSVAL": study.sponsor},
                {"STUDYID": study.protocol_number, "TSPARMCD": "TRT", "TSVAL": study.intervention_type},
                {"STUDYID": study.protocol_number, "TSPARMCD": "PHASE", "TSVAL": study.phase},
                {"STUDYID": study.protocol_number, "TSPARMCD": "PLANNED", "TSVAL": str(study.target_enrollment)},
                {"STUDYID": study.protocol_number, "TSPARMCD": "ACTUAL", "TSVAL": str(study.current_enrollment)},
                {"STUDYID": study.protocol_number, "TSPARMCD": "STATUS", "TSVAL": study.status}
            ]
        }
