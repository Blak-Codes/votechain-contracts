import React from "react";
import { useTranslation } from "react-i18next";

export default function ProposalList() {
  const { t } = useTranslation();
  return <div>{t("proposal.listTitle")}</div>;
}
