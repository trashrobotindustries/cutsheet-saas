import CRMTab, { FieldDef } from "@/components/CRMTab";

const FIELDS: FieldDef[] = [
  { key: "name",      label: "Vendor Name",         placeholder: "e.g. AAC Surface Tech" },
  { key: "contact",   label: "Contact Name",         placeholder: "First and last name" },
  { key: "phone",     label: "Phone",                type: "tel",   placeholder: "(555) 555-5555" },
  { key: "email",     label: "Email",                type: "email", placeholder: "contact@vendor.com" },
  { key: "processes", label: "Processes Performed",  placeholder: "Hard Anodize, Passivation, Heat Treat..." },
  { key: "notes",     label: "Notes",                type: "textarea", placeholder: "Certifications, lead times, account notes..." },
];

export default function VendorsPage() {
  return <CRMTab entity="vendors" fields={FIELDS} />;
}
