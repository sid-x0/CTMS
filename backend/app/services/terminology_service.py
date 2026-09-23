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
        Creates a FHIR R4 ResearchStudy standards preview with mapping metadata.
        The envelope is intentionally not a FHIR resource; ``resource`` contains
        the generated ResearchStudy representation and mapping_metadata records
        how CTMS values were treated.
        """
        status_mapping = {
            "Pending IEC Approval": "in-review",
            "IEC Approved": "approved",
            "Recruiting": "active",
            "Active": "active",
            "Suspended": "temporarily-closed-to-accrual-and-intervention",
            "Completed": "completed",
            "Closed": "closed-to-accrual-and-intervention",
        }
        fhir_status = status_mapping.get(study.status)
        resource: Dict[str, Any] = {
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
            "category": [
                {
                    "text": study.study_type
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
            "site": [
                {
                    "display": f"{s.site_code} - {s.site_name} ({s.location})"
                }
                for s in sites
            ]
        }
        if fhir_status:
            resource["status"] = fhir_status

        return {
            "resource": resource,
            "mapping_metadata": [
                {"source_field": "Study ID", "target_path": "ResearchStudy.id", "value": resource["id"], "mapping_status": "Mapped"},
                {"source_field": "Protocol number", "target_path": "ResearchStudy.identifier[official].value", "value": study.protocol_number, "mapping_status": "Mapped"},
                {"source_field": "Study title", "target_path": "ResearchStudy.title", "value": study.title, "mapping_status": "Mapped"},
                {"source_field": "Study status", "target_path": "ResearchStudy.status", "value": study.status, "mapped_value": fhir_status, "mapping_status": "Mapped" if fhir_status else "Unmapped"},
                {"source_field": "Study type", "target_path": "ResearchStudy.category[0].text", "value": study.study_type, "mapping_status": "Mapped (text only; terminology not validated)"},
                {"source_field": "Intervention type", "target_path": "ResearchStudy.focus[0].text", "value": study.intervention_type, "mapping_status": "Mapped (text only; terminology not validated)"},
                {"source_field": "Principal investigator", "target_path": "ResearchStudy.principalInvestigator.display", "value": study.principal_investigator, "mapping_status": "Prototype/display-only reference"},
                {"source_field": "Sponsor", "target_path": "ResearchStudy.sponsor.display", "value": study.sponsor, "mapping_status": "Prototype/display-only reference"},
                {"source_field": "Target / actual enrollment", "target_path": "No direct ResearchStudy R4 element", "value": f"Target: {study.target_enrollment}, Actual: {study.current_enrollment}", "mapping_status": "No direct FHIR R4 element"},
                {"source_field": "Study sites", "target_path": "ResearchStudy.site[].display", "value": "; ".join(site["display"] for site in resource["site"]), "mapping_status": "Prototype/display-only reference"},
            ],
        }

    @staticmethod
    def export_cdisc_sdtm(study: Study) -> Dict[str, Any]:
        """
        Creates a structurally shaped CDISC SDTM TS standards preview.
        Only CTMS fields with a defensible TS parameter mapping are emitted.
        """
        source_mappings = [
            ("Study title", "TITLE", "Trial Title", study.title),
            ("Sponsor", "SPONSOR", "Clinical Study Sponsor", study.sponsor),
            ("Target enrollment", "PLANSUB", "Planned Number of Subjects", str(study.target_enrollment)),
        ]
        records = [
            {
                "STUDYID": study.protocol_number,
                "DOMAIN": "TS",
                "TSSEQ": sequence,
                "TSPARMCD": parameter_code,
                "TSPARM": parameter_name,
                "TSVAL": value,
            }
            for sequence, (_, parameter_code, parameter_name, value) in enumerate(source_mappings, start=1)
        ]
        return {
            "dataset": "TS",
            "standard": "CDISC SDTM v3.3",
            "records": records,
            "mapping_metadata": [
                {"source_field": source_field, "tsparmcd": parameter_code, "tsparm": parameter_name, "mapping_status": "Mapped"}
                for source_field, parameter_code, parameter_name, _ in source_mappings
            ],
            "unmapped_source_fields": [
                "Intervention type", "Study phase", "Current enrollment", "Study status",
            ],
        }
