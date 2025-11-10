// src/components/LanguageSwitcher.jsx
import { useTranslation } from "react-i18next";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Select onValueChange={changeLanguage} defaultValue={i18n.language}>
      <SelectTrigger className="w-[120px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="hi">हिंदी</SelectItem>
        <SelectItem value="gu">ગુજરાતી</SelectItem>
        <SelectItem value="mr">मराठी</SelectItem>
      </SelectContent>
    </Select>
  );
}
