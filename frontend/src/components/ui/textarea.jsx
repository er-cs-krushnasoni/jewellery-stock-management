// // 📁 src/components/ui/textarea.jsx
// import React from "react";
// import { cn } from "@/lib/utils";

// const Textarea = React.forwardRef(({ className, ...props }, ref) => {
//   return (
//     <textarea
//       className={cn(
//         "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
//         className
//       )}
//       ref={ref}
//       {...props}
//     />
//   );
// });

// Textarea.displayName = "Textarea";

// export { Textarea };


import React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-3 text-base font-medium text-gray-900 placeholder:text-gray-500 transition-all duration-200 ring-offset-white resize-none focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/20 hover:border-gray-300 hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white/50 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-400 dark:ring-offset-gray-800 dark:focus-visible:border-blue-400 dark:focus-visible:ring-blue-400/20 dark:hover:border-gray-500 dark:hover:bg-gray-800/70 dark:disabled:hover:border-gray-600 dark:disabled:hover:bg-gray-800/50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export { Textarea };