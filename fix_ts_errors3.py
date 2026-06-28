import os

def replace_in_file(file_path, replacements):
    if not os.path.exists(file_path): return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

replace_in_file("src/layouts/CorporateLayout.tsx", [
    ("LayoutTemplate,", "")
])

replace_in_file("src/pages/FinanceDashboard.tsx", [
    ("Download,", "")
])

replace_in_file("src/pages/FollowUpsDashboard.tsx", [
    ("PhoneCall,", ""),
    ("ChevronRight,", "")
])

replace_in_file("src/pages/HomeDashboard.tsx", [
    ("AlertCircle,", ""),
    ("ArrowRight,", ""),
    ("Building2 as PropIcon", ""),
    ("import type { Lead } from '../types/definitions';", "")
])

replace_in_file("src/pages/owner/SaaSOperations/EditSubscriptionModal.tsx", [
    ("status: string", "status: 'active' | 'past_due' | 'canceled' | 'pending_verification'")
])
