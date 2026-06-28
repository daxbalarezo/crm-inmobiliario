import os
import re

files_to_remove_react = [
    "src/pages/owner/CompaniesDashboard/components/TenantMetrics.tsx",
    "src/pages/owner/CompaniesDashboard/index.tsx",
    "src/pages/owner/SaaSOperations.tsx",
    "src/pages/owner/SaaSOperations/BillingDashboard.tsx",
    "src/pages/owner/SaaSOperations/BroadcastsDashboard.tsx",
    "src/pages/owner/SaaSOperations/GlobalAuditDashboard.tsx",
    "src/pages/owner/SaaSOperations/PlanManagement.tsx",
    "src/pages/owner/SaaSOperations/SeedTemplates.tsx",
    "src/pages/settings/AssignmentRulesSettings.tsx",
    "src/pages/settings/AuditDashboard.tsx",
    "src/pages/settings/IntegrationsSettings.tsx",
    "src/pages/SettingsDashboard.tsx",
    "src/pages/SLAPage.tsx",
    "src/pages/TemplatesDashboard.tsx"
]

for file_path in files_to_remove_react:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Remove import React, { ... } from 'react'; -> import { ... } from 'react';
        content = re.sub(r"import\s+React\s*,\s*\{\s*(.*?)\s*\}\s*from\s*'react'\s*;", r"import { \1 } from 'react';", content)
        # Remove import React from 'react';
        content = re.sub(r"import\s+React\s+from\s*'react'\s*;\n?", "", content)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

# Specific fixes
def replace_in_file(file_path, replacements):
    if not os.path.exists(file_path): return
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

replace_in_file("src/pages/owner/CompaniesDashboard/components/TenantList.tsx", [
    ("import { Filter } from", "// import { Filter } from")
])

replace_in_file("src/pages/owner/CompaniesDashboard/index.tsx", [
    ("import { Settings } from", "// import { Settings } from"),
    ("const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);", ""),
    ("const [planPrices, setPlanPrices] = useState<any>(null);", ""),
    ("const handleSavePricing = async (newPrices: any) => {", "/* const handleSavePricing = async (newPrices: any) => { \n"),
    ("    } catch (e) {", "    } catch (e) {\n    } */")
])
# Because the multi-line replacement above might be tricky, let's just do a simpler one for the unused function if needed, or rely on the fact that I'll just remove the whole function:
replace_in_file("src/pages/owner/CompaniesDashboard/index.tsx", [
    ("const handleSavePricing = async", "// const handleSavePricing = async")
])

replace_in_file("src/pages/owner/SaaSOperations/BillingDashboard.tsx", [
    ("updates: { current_period_end: string, status: string }", "updates: { current_period_end: string, status: 'active' | 'past_due' | 'canceled' | 'pending_verification' }")
])

replace_in_file("src/pages/owner/SaaSOperations/BroadcastsDashboard.tsx", [
    ("const [severity, setSeverity] = useState('info');", "const [severity, setSeverity] = useState<'info'|'warning'|'critical'>('info');")
])

replace_in_file("src/pages/owner/SaaSOperations/GlobalAuditDashboard.tsx", [
    ("Wifi", "")
])

replace_in_file("src/pages/owner/SaaSOperations/PlanManagement.tsx", [
    ("const { tenantId, userPermissions, loading } = useCRM();", "const { tenantId, userPermissions } = useCRM();")
])

replace_in_file("src/pages/owner/SaaSOperations/SeedTemplates.tsx", [
    ("import { SeedTemplate } from", "// import { SeedTemplate } from"),
    ("const { tenantId, userPermissions, loading } = useCRM();", "const { tenantId, userPermissions } = useCRM();")
])

replace_in_file("src/pages/settings/ContractTemplateSettings.tsx", [
    ("Save, AlertCircle", "")
])

replace_in_file("src/pages/settings/RolesSettings.tsx", [
    ("settings: { manage: false }", "finance: { read: 'own', create: false, approve: false },\n    settings: { manage: false }")
])

replace_in_file("src/pages/TeamDashboard.tsx", [
    ("const [isCheckingCollision, setIsCheckingCollision] = useState(false);", "")
])

replace_in_file("src/utils/dataSeeder.ts", [
    ("deleteDoc", "")
])
