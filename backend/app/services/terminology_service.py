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

# ---------------------------------------------------------------------------
# FHIR R4 ResearchStudy.status valid code set
# Source: http://hl7.org/fhir/R4/valueset-research-study-status.html
# Only CTMS statuses with a defensible semantic mapping are included.
# CTMS statuses not listed here have no defensible R4 equivalent and are
# left unmapped rather than forcing an incorrect code.
# ---------------------------------------------------------------------------
FHIR_STATUS_MAP: Dict[str, str] = {
    # "Draft" intentionally omitted — FHIR R4 has no "draft" code for ResearchStudy
    "Pending IEC Approval": "in-review",           # Study is under ethics committee review
    "IEC Approved": "approved",                    # Ethics approval received
    "CTRI Registered": "approved",                 # Registry approval; closest is "approved"
    "Recruiting": "active",                        # Open to accrual, maps to FHIR "active"
    "Active": "active",                            # Intervention ongoing
    "Suspended": "temporarily-closed-to-accrual-and-intervention",
    "Completed": "completed",
    "Closed": "closed-to-accrual-and-intervention",
}

# ---------------------------------------------------------------------------
# CDISC SDTM TS parameter definitions
# Codes taken from CDISC SDTM Implementation Guide v3.3, Appendix C2 (TS)
# Only parameters for which we have actual CTMS values are included.
# TSVALCD/TSVCDREF/TSVCDVER are populated only when a real coded value exists.
# ---------------------------------------------------------------------------
TS_PARAM_DEFS = [
    # (source_field_label, TSPARMCD, TSPARM, value_fn, tsvalcd_fn, tsvcdref, tsvcdver)
    (
        "Study title",
        "TITLE",
        "Trial Title",
        lambda s: s.title,
        None, None, None,
    ),
    (
        "Sponsor",
        "SPONSOR",
        "Clinical Study Sponsor",
        lambda s: s.sponsor,
        None, None, None,
    ),
    (
        "Target enrollment",
        "PLANSUB",
        "Planned Number of Subjects",
        lambda s: str(s.target_enrollment),
        None, None, None,
    ),
    (
        "Study phase",
        "PHASE",
        "Trial Phase Classification",
        lambda s: s.phase if s.phase else None,
        # When phase matches a known NCI Thesaurus code we could add TSVALCD;
        # for now we omit coded values to avoid fabrication.
        None, None, None,
    ),
]

# Fields present in CTMS that have no defensible standard TS parameter
TS_UNMAPPED_FIELDS = [
    "Intervention type",
    "Current enrollment",
    "Study status",
]


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
        Creates a FHIR R4 ResearchStudy sample mapping for this CTMS study.

        Notes on honesty:
        - ResearchStudy.enrollment is NOT used: CTMS enrollment counts are integers,
          not Group resources representing inclusion/exclusion criteria.
        - principalInvestigator and sponsor are display-only references; no
          Practitioner or Organization resources exist in this CTMS database.
        - site entries are display-only references; no Location resources exist.
        - category and focus use free text only; terminology is not validated.
        - Status is mapped only where the semantic mapping is defensible.
        """
        fhir_status = FHIR_STATUS_MAP.get(study.status)  # None if not mappable

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
            # category: text only; no coding system validated
            "category": [
                {
                    "text": study.study_type
                }
            ],
            # focus: text only; no coding system validated
            "focus": [
                {
                    "text": study.intervention_type
                }
            ],
            # Display-only reference — no Practitioner resource exists in this CTMS
            "principalInvestigator": {
                "display": study.principal_investigator
            },
            # Display-only reference — no Organization resource exists in this CTMS
            "sponsor": {
                "display": study.sponsor
            },
            # Display-only references — no Location resources exist in this CTMS
            "site": [
                {
                    "display": f"{s.site_code} - {s.site_name} ({s.location})"
                }
                for s in sites
            ]
            # NOTE: enrollment intentionally omitted.
            # ResearchStudy.enrollment is a Reference(Group) for inclusion/exclusion
            # criteria. CTMS enrollment counts (target_enrollment, current_enrollment)
            # are integers and do not correspond to Group resources.
        }

        # status is only emitted when a defensible mapping exists
        if fhir_status:
            resource["status"] = fhir_status

        mapping_metadata = [
            {
                "source_field": "Study ID",
                "fhir_path": "ResearchStudy.id",
                "ctms_value": resource["id"],
                "mapped_value": resource["id"],
                "mapping_status": "Mapped",
            },
            {
                "source_field": "Protocol number",
                "fhir_path": "ResearchStudy.identifier[official].value",
                "ctms_value": study.protocol_number,
                "mapped_value": study.protocol_number,
                "mapping_status": "Mapped",
            },
            {
                "source_field": "Study title",
                "fhir_path": "ResearchStudy.title",
                "ctms_value": study.title,
                "mapped_value": study.title,
                "mapping_status": "Mapped",
            },
            {
                "source_field": "Study status",
                "fhir_path": "ResearchStudy.status",
                "ctms_value": study.status,
                "mapped_value": fhir_status,
                "mapping_status": "Mapped" if fhir_status else "Unmapped — no defensible R4 equivalent for this CTMS status",
            },
            {
                "source_field": "Study type",
                "fhir_path": "ResearchStudy.category[0].text",
                "ctms_value": study.study_type,
                "mapped_value": study.study_type,
                "mapping_status": "Mapped (free text only — terminology not validated)",
            },
            {
                "source_field": "Intervention type",
                "fhir_path": "ResearchStudy.focus[0].text",
                "ctms_value": study.intervention_type,
                "mapped_value": study.intervention_type,
                "mapping_status": "Mapped (free text only — terminology not validated)",
            },
            {
                "source_field": "Principal investigator",
                "fhir_path": "ResearchStudy.principalInvestigator.display",
                "ctms_value": study.principal_investigator,
                "mapped_value": study.principal_investigator,
                "mapping_status": "Prototype/display-only reference — no Practitioner resource exists",
            },
            {
                "source_field": "Sponsor",
                "fhir_path": "ResearchStudy.sponsor.display",
                "ctms_value": study.sponsor,
                "mapped_value": study.sponsor,
                "mapping_status": "Prototype/display-only reference — no Organization resource exists",
            },
            {
                "source_field": "Target / actual enrollment",
                "fhir_path": "No direct ResearchStudy R4 element",
                "ctms_value": f"Target: {study.target_enrollment}, Actual: {study.current_enrollment}",
                "mapped_value": None,
                "mapping_status": "Not directly represented — ResearchStudy.enrollment is Reference(Group) for inclusion/exclusion criteria, not enrollment counts",
            },
            {
                "source_field": "Study sites",
                "fhir_path": "ResearchStudy.site[].display",
                "ctms_value": "; ".join(
                    f"{s.site_code} - {s.site_name}" for s in sites
                ),
                "mapped_value": "; ".join(
                    f"{s.site_code} - {s.site_name}" for s in sites
                ) or None,
                "mapping_status": "Prototype/display-only reference — no Location resources exist",
            },
        ]

        return {
            "resource": resource,
            "mapping_metadata": mapping_metadata,
        }

    @staticmethod
    def export_cdisc_sdtm(study: Study) -> Dict[str, Any]:
        """
        Creates a structurally shaped CDISC SDTM TS (Trial Summary) dataset.

        Each record contains: STUDYID, DOMAIN, TSSEQ, TSPARMCD, TSPARM, TSVAL.
        TSVALCD / TSVCDREF / TSVCDVER are only populated when an actual known
        terminology code source and version exists; they are omitted otherwise.

        Only CTMS fields with a defensible standard TS parameter mapping are
        included. Fields without a defensible mapping are listed separately.

        Reference: CDISC SDTM Implementation Guide v3.3, Appendix C2 (TS domain).
        """
        records = []
        mapping_metadata = []
        seq = 1

        for (source_label, parmcd, parm, value_fn, tsvalcd_fn, tsvcdref, tsvcdver) in TS_PARAM_DEFS:
            val = value_fn(study)
            if val is None:
                # Skip if the study has no value for this field
                continue

            record: Dict[str, Any] = {
                "STUDYID": study.protocol_number,
                "DOMAIN": "TS",
                "TSSEQ": seq,
                "TSPARMCD": parmcd,
                "TSPARM": parm,
                "TSVAL": val,
            }

            # Only add coded value fields when a real code is available
            if tsvalcd_fn:
                tsvalcd = tsvalcd_fn(study)
                if tsvalcd:
                    record["TSVALCD"] = tsvalcd
                    record["TSVCDREF"] = tsvcdref
                    record["TSVCDVER"] = tsvcdver

            records.append(record)
            mapping_metadata.append({
                "source_field": source_label,
                "tsparmcd": parmcd,
                "tsparm": parm,
                "mapping_status": "Mapped",
            })
            seq += 1

        return {
            "dataset": "TS",
            "standard": "CDISC SDTM v3.3",
            "records": records,
            "mapping_metadata": mapping_metadata,
            "unmapped_source_fields": TS_UNMAPPED_FIELDS,
        }
