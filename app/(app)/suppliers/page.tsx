import CRMTab, { FieldDef } from "@/components/CRMTab";

const FIELDS: FieldDef[] = [
  { key: "name",              label: "Supplier Name",      placeholder: "e.g. Metals Inc." },
  { key: "contact",           label: "Contact Name",       placeholder: "First and last name" },
  { key: "phone",             label: "Phone",              type: "tel",   placeholder: "(555) 555-5555" },
  { key: "email",             label: "Email",              type: "email", placeholder: "contact@supplier.com" },
  { key: "materialsSupplied", label: "Materials Supplied", placeholder: "6061 Al bar, 304 SS sheet..." },
  { key: "notes",             label: "Notes",              type: "textarea", placeholder: "Lead times, minimums, account notes..." },
];

export default function SuppliersPage() {
  return <CRMTab entity="suppliers" fields={FIELDS} />;
}
