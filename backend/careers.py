"""Curated career paths by the student's current education level (Maharashtra focus).

Static overview data: no API calls, so the Careers page always shows options, even in mock
mode. Live jobs and videos for a path come from /api/jobs and /api/videos.
"""

LEVELS = {
    "10th": "10th (SSC)",
    "12th-pcm": "12th Science (PCM)",
    "12th-pcb": "12th Science (PCB)",
    "12th-commerce": "12th Commerce",
    "12th-arts": "12th Arts",
    "diploma": "Diploma (Engineering)",
    "btech": "B.E./B.Tech",
    "graduate": "Other graduate",
}

BRANCHES = {
    "computer": "Computer Engineering",
    "it": "Information Technology",
    "aids": "AI & Data Science",
    "entc": "Electronics & Telecommunication (ENTC)",
    "mechanical": "Mechanical Engineering",
    "civil": "Civil Engineering",
    "electrical": "Electrical Engineering",
}

# Search terms that return sensible Google Jobs results for each branch.
_BRANCH_JOB_QUERY = {
    "computer": "software engineer fresher",
    "it": "software developer fresher",
    "aids": "data analyst fresher",
    "entc": "electronics engineer fresher",
    "mechanical": "mechanical engineer fresher",
    "civil": "civil engineer fresher",
    "electrical": "electrical engineer fresher",
}

_BRANCH_ROLES = {
    "computer": ["Software engineer", "Full-stack developer", "Cloud / DevOps engineer"],
    "it": ["Software developer", "QA / test engineer", "System administrator"],
    "aids": ["Data analyst", "ML engineer", "Data engineer"],
    "entc": ["Embedded engineer", "VLSI / chip design", "Telecom engineer"],
    "mechanical": ["Design engineer", "Production engineer", "Automotive engineer"],
    "civil": ["Site engineer", "Structural engineer", "Quantity surveyor"],
    "electrical": ["Electrical design engineer", "Power / energy engineer", "Maintenance engineer"],
}


def _path(id, title, courses, exams, careers, interests, job_query, video_query):
    return {
        "id": id,
        "title": title,
        "courses": courses,
        "exams": exams,
        "careers": careers,
        "interests": interests,
        "job_query": job_query,
        "video_query": video_query,
    }


CAREER_PATHS = {
    "10th": [
        _path("11th-science", "11th-12th Science", ["Science with PCM (engineering side) or PCB (medical side)"],
              ["None for admission (FYJC merit on 10th marks)"],
              ["Engineer", "Doctor", "Pharmacist", "Scientist"],
              ["coding", "electronics", "biology"], "junior engineer fresher", "which stream after 10th science career"),
        _path("11th-commerce", "11th-12th Commerce", ["Commerce with Maths or without"],
              ["None for admission (FYJC merit on 10th marks)"],
              ["Chartered Accountant", "Banker", "Business analyst", "Entrepreneur"],
              ["business"], "accounts assistant fresher", "commerce stream after 10th career options"),
        _path("11th-arts", "11th-12th Arts", ["Arts / Humanities"],
              ["None for admission (FYJC merit on 10th marks)"],
              ["Lawyer", "Journalist", "Designer", "Civil services", "Teacher"],
              ["design", "teaching", "government"], "content writer fresher", "arts stream after 10th career options"),
        _path("polytechnic", "Polytechnic diploma (3 years)", ["Diploma in Computer, Mechanical, Civil, ENTC, Electrical…"],
              ["DTE Maharashtra polytechnic admission (CAP, on 10th marks)"],
              ["Junior engineer", "Technician", "Direct 2nd year B.E. later"],
              ["coding", "electronics"], "diploma engineer fresher", "polytechnic diploma after 10th career"),
        _path("iti", "ITI trade course (1-2 years)", ["Electrician, Fitter, Mechanic, COPA and other trades"],
              ["DVET Maharashtra ITI admission (on 10th marks)"],
              ["Skilled technician", "Apprentice", "Government technical jobs"],
              ["electronics", "government"], "ITI electrician fresher", "ITI course after 10th career"),
    ],
    "12th-pcm": [
        _path("be-btech", "B.E./B.Tech Engineering", ["Computer, IT, AI&DS, ENTC, Mechanical, Civil, Electrical…"],
              ["MHT-CET", "JEE Main"],
              ["Software engineer", "Data analyst", "Core engineer", "Researcher"],
              ["coding", "electronics"], "graduate engineer trainee fresher", "engineering branch career guidance"),
        _path("barch", "B.Arch Architecture (5 years)", ["Bachelor of Architecture"],
              ["NATA", "JEE Main Paper 2"],
              ["Architect", "Urban planner", "Interior designer"],
              ["design"], "junior architect fresher", "architecture career after 12th"),
        _path("bsc-bca", "B.Sc / BCA", ["B.Sc (Physics, Maths, CS, Statistics)", "BCA"],
              ["College merit list", "MAH-BBA/BCA CET (for BCA)"],
              ["Software developer", "Data analyst", "Scientist (with M.Sc)", "Teacher"],
              ["coding", "teaching"], "BCA fresher developer", "BSc vs BCA career options"),
        _path("nda", "Defence (NDA)", ["Army, Navy or Air Force officer training"],
              ["NDA exam (UPSC)"],
              ["Commissioned officer in the armed forces"],
              ["government"], "defence jobs fresher", "NDA after 12th preparation"),
    ],
    "12th-pcb": [
        _path("mbbs-bds", "MBBS / BDS (Medicine, Dentistry)", ["MBBS", "BDS", "BAMS / BHMS (AYUSH)"],
              ["NEET-UG"],
              ["Doctor", "Dentist", "Specialist (with MD/MS)"],
              ["biology"], "medical officer fresher", "MBBS career guidance NEET"),
        _path("bpharm", "B.Pharm Pharmacy", ["Bachelor of Pharmacy"],
              ["MHT-CET (PCB or PCM)"],
              ["Pharmacist", "Drug inspector", "Pharma R&D", "Medical representative"],
              ["biology", "business"], "pharmacist fresher", "B Pharm career scope"),
        _path("nursing", "B.Sc Nursing", ["B.Sc Nursing"],
              ["MHT-CET for nursing / college entrance"],
              ["Staff nurse", "Nurse educator", "Hospital administration"],
              ["biology"], "staff nurse fresher", "BSc nursing career"),
        _path("agriculture", "B.Sc Agriculture / allied", ["B.Sc Agriculture", "Horticulture", "Food technology"],
              ["MHT-CET (PCB)"],
              ["Agriculture officer", "Agri-business", "Food quality analyst"],
              ["biology", "government", "business"], "agriculture officer fresher", "BSc agriculture career scope"),
    ],
    "12th-commerce": [
        _path("bcom-bba", "B.Com / BBA", ["B.Com", "BBA", "BMS"],
              ["College merit list", "MAH-BBA/BCA CET (for BBA)"],
              ["Accountant", "Banking", "Marketing", "HR", "MBA later"],
              ["business"], "accounts executive fresher", "BCom vs BBA career"),
        _path("ca", "Chartered Accountant (CA)", ["CA Foundation → Intermediate → Final with articleship"],
              ["ICAI CA Foundation"],
              ["Chartered accountant", "Auditor", "Tax consultant"],
              ["business"], "article assistant CA", "how to become CA after 12th"),
        _path("cs", "Company Secretary (CS)", ["CS Executive → Professional"],
              ["ICSI CSEET"],
              ["Company secretary", "Compliance officer"],
              ["business"], "company secretary trainee", "company secretary career"),
        _path("law-commerce", "Law (5-year BBA LLB / B.Com LLB)", ["Integrated 5-year law degree"],
              ["CLAT", "MH-CET Law (5-year)"],
              ["Corporate lawyer", "Legal advisor", "Judiciary"],
              ["business", "government"], "legal associate fresher", "law career after 12th"),
    ],
    "12th-arts": [
        _path("ba", "BA (Humanities)", ["Psychology, Economics, Political science, Languages…"],
              ["College merit list"],
              ["Psychologist (with MA)", "Civil services", "Teacher", "Researcher"],
              ["teaching", "government"], "fresher graduate", "BA career options"),
        _path("law-arts", "Law (5-year BA LLB)", ["Integrated BA LLB"],
              ["CLAT", "MH-CET Law (5-year)"],
              ["Lawyer", "Legal advisor", "Judiciary"],
              ["government"], "legal associate fresher", "BA LLB career"),
        _path("journalism", "Journalism & Mass Communication", ["BMM / BJMC"],
              ["College entrance tests"],
              ["Journalist", "Content creator", "PR executive"],
              ["design"], "content writer fresher", "journalism career after 12th"),
        _path("design", "Design (B.Des)", ["Product, communication, fashion design"],
              ["UCEED", "NID DAT"],
              ["UI/UX designer", "Product designer", "Fashion designer"],
              ["design"], "UI UX designer fresher", "B Des design career"),
    ],
    "diploma": [
        _path("dse", "Direct Second Year Engineering (DSE)", ["B.E./B.Tech from 2nd year"],
              ["DSE CAP (DTE Maharashtra, on diploma marks)"],
              ["Engineer after a degree", "Higher studies"],
              ["coding", "electronics"], "graduate engineer trainee fresher", "direct second year engineering after diploma"),
        _path("diploma-jobs", "Start working", ["Apply as a junior engineer or technician"],
              ["Company tests and interviews", "Apprenticeship schemes"],
              ["Junior engineer", "Supervisor", "Technician"],
              ["electronics", "government"], "diploma engineer fresher", "jobs after diploma engineering"),
    ],
    "btech": [
        _path("industry", "Industry job", ["Campus placement or off-campus hiring"],
              ["Company aptitude tests and interviews"],
              ["Role depends on your branch"],
              ["coding", "electronics"], "engineer fresher", "engineering fresher job preparation"),
        _path("gate", "M.Tech / PSU jobs", ["M.Tech at IITs/NITs", "PSU jobs (NTPC, BHEL, ONGC…)"],
              ["GATE"],
              ["Researcher", "PSU engineer", "Lecturer"],
              ["government", "teaching"], "PSU recruitment through GATE", "GATE preparation strategy"),
        _path("mba", "MBA", ["MBA / PGDM"],
              ["CAT", "MAH-MBA CET"],
              ["Product manager", "Consultant", "Business analyst"],
              ["business"], "management trainee fresher", "MBA after engineering"),
        _path("ms-abroad", "MS abroad", ["MS in the US, Germany, Canada…"],
              ["GRE", "IELTS / TOEFL"],
              ["Engineer or researcher abroad"],
              ["coding"], "research assistant", "MS abroad after BTech"),
        _path("govt", "Government jobs", ["State and central services"],
              ["MPSC", "UPSC", "SSC"],
              ["Engineering services", "Administrative services"],
              ["government"], "government engineer recruitment", "MPSC engineering services preparation"),
    ],
    "graduate": [
        _path("mba-grad", "MBA", ["MBA / PGDM"],
              ["CAT", "MAH-MBA CET"],
              ["Manager", "Consultant", "Business analyst"],
              ["business"], "management trainee fresher", "MBA career guidance"),
        _path("mca", "MCA", ["Master of Computer Applications"],
              ["MAH-MCA CET"],
              ["Software developer", "System analyst"],
              ["coding"], "software developer fresher", "MCA career scope"),
        _path("govt-grad", "Government jobs", ["State and central services, banking"],
              ["MPSC", "UPSC", "IBPS / SBI bank exams"],
              ["Officer in government or banks"],
              ["government"], "government jobs graduate", "MPSC UPSC preparation for graduates"),
        _path("bed", "Teaching (B.Ed)", ["Bachelor of Education"],
              ["MAH-B.Ed CET"],
              ["School teacher", "Education counsellor"],
              ["teaching"], "teacher fresher", "BEd teaching career"),
    ],
}


def career_paths(level: str, branch: str | None = None) -> list[dict]:
    """Paths for one level. For B.E./B.Tech, the branch sharpens the industry job search."""
    paths = [dict(p) for p in CAREER_PATHS[level]]
    if level == "btech" and branch in BRANCHES:
        for p in paths:
            if p["id"] == "industry":
                p["job_query"] = _BRANCH_JOB_QUERY[branch]
                p["careers"] = _BRANCH_ROLES[branch]
                p["video_query"] = f"{BRANCHES[branch]} career after graduation"
    return paths
