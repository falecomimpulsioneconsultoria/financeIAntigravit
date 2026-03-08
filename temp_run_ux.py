import sys
import json
import os

sys.path.insert(0, os.path.abspath("."))
from importlib.machinery import SourceFileLoader

ux_audit = SourceFileLoader("ux_audit", ".agent/skills/frontend-design/scripts/ux_audit.py").load_module()

auditor = ux_audit.UXAuditor()
auditor.audit_directory('.')

with open("ux_issues.txt", "w", encoding="utf-8") as f:
    for issue in auditor.issues:
        f.write(issue + "\n")
