import React from "react";
import { useTranslation } from "react-i18next";

export default function ProposalDetail() {
  const { t } = useTranslation();
  return <div>{t("proposal.title")}</div>;
}
