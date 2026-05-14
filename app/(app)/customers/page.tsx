import CRMTab, { FieldDef } from "@/components/CRMTab";

const FIELDS: FieldDef[] = [
  { key: "name",             label: "Company Name",       placeholder: "e.g. Acme Aerospace" },
  { key: "contact",          label: "Contact Name",       placeholder: "First and last name" },
  { key: "phone",            label: "Phone",              type: "tel",   placeholder: "(555) 555-5555" },
  { key: "email",            label: "Email",              type: "email", placeholder: "contact@company.com" },
  { key: "address",          label: "Address",            placeholder: "Street, City, State, ZIP" },
  { key: "paymentTerms",     label: "Payment Terms",      placeholder: "Net 30, COD, etc." },
  { key: "preferredCarrier", label: "Preferred Carrier",  placeholder: "FedEx, UPS, customer pickup..." },
  { key: "notes",            label: "Notes",              type: "textarea", placeholder: "Any relevant notes about this customer..." },
];

export default function CustomersPage() {
  return <CRMTab entity="customers" fields={FIELDS} />;
}
