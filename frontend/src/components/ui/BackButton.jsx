// 📁 src/components/BackButton.jsx
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function BackButton({ to, label }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  // return (
  //   <div className="mb-4">
  //     <Button 
  //       variant="outline" 
  //       onClick={handleBack}
  //       className="flex items-center gap-2"
  //     >
  //       <span>←</span>
  //       {label || t("Back")}
  //     </Button>
  //   </div>
  // );
  return (
    <div className="mb-6 md:mb-8">
      <Button 
        variant="outline" 
        onClick={handleBack}
        className="group flex items-center gap-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50/80 font-medium px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 min-h-[44px] dark:bg-gray-800/80 dark:border-gray-600 dark:text-gray-200 dark:hover:text-gray-100 dark:hover:bg-gray-700/80 dark:hover:border-gray-500"
      >
        {/* Modern arrow icon with smooth rotation on hover */}
        <span className="text-lg font-semibold transition-transform duration-200 group-hover:-translate-x-1">
          ←
        </span>
        <span className="text-sm md:text-base">
          {label || t("Back")}
        </span>
      </Button>
    </div>
  );
}