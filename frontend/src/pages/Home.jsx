// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', 
'#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1'];

export default function Home() {
  const [categoryData, setCategoryData] = useState({ gold: [], silver: [] });
  const [totals, setTotals] = useState({ goldGross: 0, goldPure: 0, silverGross: 0, silverPure: 0 });
  const navigate = useNavigate();

  const handleCardClick = (metalType) => {
    navigate(`/${metalType.toLowerCase()}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/metadata`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const { totalGoldGross, totalGoldPure, totalSilverGross, totalSilverPure, categoryTotals } = res.data;

        let gold = [];
        let silver = [];

        for (const [category, { pureWeight, metal }] of Object.entries(categoryTotals)) {
            const data = { name: category, value: pureWeight };
            if (metal === "gold") gold.push(data);
            else if (metal === "silver") silver.push(data);
          }
          

        setCategoryData({ gold, silver });
        setTotals({ goldGross: totalGoldGross, goldPure: totalGoldPure, silverGross: totalSilverGross, silverPure: totalSilverPure });
      } catch (err) {
        console.error("Error fetching metadata:", err);
      }
    };

    fetchData();
  }, []);

  const renderLabel = ({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`;


// return (
//   <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" id="report-section">
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
//       {/* Modern Header with Gradient */}
//       <div className="text-center space-y-4">
//         <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
//           <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//           </svg>
//         </div>
//         <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-300 dark:to-indigo-300">
//           Stock Overview
//         </h2>
//         <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
//           Track your precious metals portfolio with real-time insights
//         </p>
//       </div>

//       {/* Premium Metal Cards with Glassmorphism */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//         {["gold", "silver"].map((metal) => {
//           const isGold = metal === "gold";
//           const title = isGold ? "Gold" : "Silver";
//           const gross = isGold ? totals.goldGross : totals.silverGross;
//           const pure = isGold ? totals.goldPure : totals.silverPure;

//           return (
//             <button
//               key={metal}
//               onClick={() => {
//                 console.log(`Clicking on ${metal}`); // Debug line
//                 handleCardClick(metal);
//               }}
//               className="group cursor-pointer text-left w-full focus:outline-none focus:ring-4 focus:ring-blue-500/30 rounded-3xl transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
//             >
//               <Card className={`relative overflow-hidden rounded-3xl shadow-2xl bg-white/80 backdrop-blur-md border-2 ${
//                 isGold 
//                   ? 'border-yellow-200/50 hover:border-yellow-300/70 hover:shadow-yellow-500/20' 
//                   : 'border-gray-200/50 hover:border-gray-300/70 hover:shadow-gray-500/20'
//               } hover:shadow-3xl transition-all duration-300 h-full dark:bg-gray-800/80 dark:border-gray-700/50`}>
                
//                 {/* Animated Background Pattern */}
//                 <div className={`absolute inset-0 opacity-5 ${
//                   isGold ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-gradient-to-br from-gray-400 to-slate-600'
//                 } group-hover:opacity-10 transition-opacity duration-300`}></div>
                
//                 {/* Floating Orbs */}
//                 <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20 blur-2xl ${
//                   isGold ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-gray-400 to-slate-500'
//                 } group-hover:opacity-30 transition-opacity duration-500`}></div>
//                 <div className={`absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-15 blur-2xl ${
//                   isGold ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-slate-400 to-gray-500'
//                 } group-hover:opacity-25 transition-opacity duration-500`}></div>

//                 <CardContent className="relative p-8 space-y-6">
//                   {/* Metal Icon and Title */}
//                   <div className="flex items-center justify-between">
//                     <div className="flex items-center space-x-4">
//                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
//                         isGold 
//                           ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' 
//                           : 'bg-gradient-to-br from-gray-400 to-slate-500 text-white'
//                       }`}>
//                         <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
//                           <path d="M12 2L2 7V17C2 18.1 2.9 19 4 19H20C21.1 19 22 18.1 22 17V7L12 2Z"/>
//                         </svg>
//                       </div>
//                       <h3 className={`text-2xl font-bold ${
//                         isGold ? 'text-yellow-700' : 'text-gray-700'
//                       } dark:text-gray-100`}>
//                         {title}
//                       </h3>
//                     </div>
//                     <div className="opacity-60 group-hover:opacity-80 transition-opacity duration-300">
//                       <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//                       </svg>
//                     </div>
//                   </div>

//                   {/* Weight Statistics */}
//                   <div className="grid grid-cols-2 gap-6">
//                     <div className="space-y-2">
//                       <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
//                         Gross Weight
//                       </p>
//                       <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
//                         {gross}
//                         <span className="text-base font-normal text-gray-500 ml-1">g</span>
//                       </p>
//                     </div>
//                     <div className="space-y-2">
//                       <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
//                         Pure Weight
//                       </p>
//                       <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
//                         {pure}
//                         <span className="text-base font-normal text-gray-500 ml-1">g</span>
//                       </p>
//                     </div>
//                   </div>

//                   {/* Progress Bar */}
//                   <div className="space-y-2">
//                     <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
//                       <span>Purity Ratio</span>
//                       <span>{gross > 0 ? Math.round((pure / gross) * 100) : 0}%</span>
//                     </div>
//                     <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
//                       <div 
//                         className={`h-full rounded-full transition-all duration-1000 ${
//                           isGold 
//                             ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
//                             : 'bg-gradient-to-r from-gray-400 to-slate-500'
//                         }`}
//                         style={{ width: `${gross > 0 ? (pure / gross) * 100 : 0}%` }}
//                       ></div>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </button>
//           );
//         })}
//       </div>

//       {/* Enhanced Pie Charts Section */}
//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
//         {[{ title: "Gold Category Distribution", data: categoryData.gold }, { title: "Silver Category Distribution", data: categoryData.silver }].map(
//           ({ title, data }, i) => (
//             <Card key={i} className="group rounded-3xl shadow-2xl bg-white/80 backdrop-blur-md border-2 border-gray-200/50 hover:border-gray-300/70 hover:shadow-3xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50">
              
//               {/* Card Header */}
//               <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-700/50">
//                 <div className="flex items-center justify-between">
//                   <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
//                     {title}
//                   </h3>
//                   <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
//                     <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//                     </svg>
//                   </div>
//                 </div>
//               </div>

//               <CardContent className="p-6">
//                 {data.length > 0 ? (
//                   <div className="space-y-4">
//                     {/* Chart Container */}
//                     <div className="relative">
//                       <ResponsiveContainer width="100%" height={320}>
//                         <PieChart>
//                           <Pie 
//                             data={data} 
//                             dataKey="value" 
//                             nameKey="name" 
//                             cx="50%" 
//                             cy="50%" 
//                             outerRadius={110} 
//                             label={renderLabel}
//                             className="drop-shadow-lg"
//                           >
//                             {data.map((_, index) => (
//                               <Cell key={index} fill={COLORS[index % COLORS.length]} />
//                             ))}
//                           </Pie>
//                           <Tooltip 
//                             contentStyle={{
//                               backgroundColor: 'rgba(255, 255, 255, 0.95)',
//                               backdropFilter: 'blur(10px)',
//                               border: '1px solid rgba(229, 231, 235, 0.5)',
//                               borderRadius: '12px',
//                               boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
//                             }}
//                           />
//                         </PieChart>
//                       </ResponsiveContainer>
//                     </div>

//                     {/* Legend */}
//                     <div className="grid grid-cols-2 gap-2 mt-4">
//                       {data.map((item, index) => (
//                         <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
//                           <div 
//                             className="w-3 h-3 rounded-full shadow-sm"
//                             style={{ backgroundColor: COLORS[index % COLORS.length] }}
//                           ></div>
//                           <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
//                             {item.name}
//                           </span>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="flex flex-col items-center justify-center py-12 space-y-4">
//                     <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
//                       <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
//                       </svg>
//                     </div>
//                     <p className="text-gray-500 dark:text-gray-400 text-center font-medium">
//                       No data available
//                     </p>
//                     <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
//                       Data will appear here once categories are added
//                     </p>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           )
//         )}
//       </div>

//     </div>
//   </div>
// );

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" id="report-section">
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-8 sm:space-y-12">
      
      {/* Modern Header with Gradient */}
      <div className="text-center space-y-3 sm:space-y-4">
        {/* <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-2 sm:mb-4">
          <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div> */}
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent dark:from-gray-100 dark:via-blue-300 dark:to-indigo-300">
          Stock Overview
        </h2>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-2">
          Track your precious metals portfolio with real-time insights
        </p>
      </div>

      {/* Premium Metal Cards with Glassmorphism */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {["gold", "silver"].map((metal) => {
          const isGold = metal === "gold";
          const title = isGold ? "Gold" : "Silver";
          const gross = isGold ? totals.goldGross : totals.silverGross;
          const pure = isGold ? totals.goldPure : totals.silverPure;

          return (
            <button
              key={metal}
              onClick={() => {
                console.log(`Clicking on ${metal}`); // Debug line
                handleCardClick(metal);
              }}
              className="group cursor-pointer text-left w-full focus:outline-none focus:ring-4 focus:ring-blue-500/30 rounded-2xl sm:rounded-3xl transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Card className={`relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl bg-white/80 backdrop-blur-md border-2 ${
                isGold 
                  ? 'border-yellow-200/50 hover:border-yellow-300/70 hover:shadow-yellow-500/20' 
                  : 'border-gray-200/50 hover:border-gray-300/70 hover:shadow-gray-500/20'
              } hover:shadow-3xl transition-all duration-300 h-full dark:bg-gray-800/80 dark:border-gray-700/50`}>
                
                {/* Animated Background Pattern */}
                <div className={`absolute inset-0 opacity-5 ${
                  isGold ? 'bg-gradient-to-br from-yellow-400 to-amber-600' : 'bg-gradient-to-br from-gray-400 to-slate-600'
                } group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                {/* Floating Orbs - Adjusted for mobile */}
                <div className={`absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-20 h-20 sm:w-32 sm:h-32 rounded-full opacity-20 blur-2xl ${
                  isGold ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 'bg-gradient-to-br from-gray-400 to-slate-500'
                } group-hover:opacity-30 transition-opacity duration-500`}></div>
                <div className={`absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 w-16 h-16 sm:w-24 sm:h-24 rounded-full opacity-15 blur-2xl ${
                  isGold ? 'bg-gradient-to-br from-amber-400 to-yellow-500' : 'bg-gradient-to-br from-slate-400 to-gray-500'
                } group-hover:opacity-25 transition-opacity duration-500`}></div>

                <CardContent className="relative p-4 sm:p-8 space-y-4 sm:space-y-6">
                  {/* Metal Icon and Title */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg ${
                        isGold 
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' 
                          : 'bg-gradient-to-br from-gray-400 to-slate-500 text-white'
                      }`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7V17C2 18.1 2.9 19 4 19H20C21.1 19 22 18.1 22 17V7L12 2Z"/>
                        </svg>
                      </div>
                      <h3 className={`text-xl sm:text-2xl font-bold ${
                        isGold ? 'text-yellow-700' : 'text-gray-700'
                      } dark:text-gray-100`}>
                        {title}
                      </h3>
                    </div>
                    <div className="opacity-60 group-hover:opacity-80 transition-opacity duration-300">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Weight Statistics */}
                  <div className="grid grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Gross Weight
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {gross}
                        <span className="text-sm sm:text-base font-normal text-gray-500 ml-1">g</span>
                      </p>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Pure Weight
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
                        {pure}
                        <span className="text-sm sm:text-base font-normal text-gray-500 ml-1">g</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span>Purity Ratio</span>
                      <span>{gross > 0 ? Math.round((pure / gross) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isGold 
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                            : 'bg-gradient-to-r from-gray-400 to-slate-500'
                        }`}
                        style={{ width: `${gross > 0 ? (pure / gross) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {/* Enhanced Pie Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
        {[{ title: "Gold Category Distribution", data: categoryData.gold }, { title: "Silver Category Distribution", data: categoryData.silver }].map(
          ({ title, data }, i) => {
            // Calculate total for percentages
            const total = data.reduce((sum, item) => sum + item.value, 0);
            
            return (
              <Card key={i} className="group rounded-2xl sm:rounded-3xl shadow-2xl bg-white/80 backdrop-blur-md border-2 border-gray-200/50 hover:border-gray-300/70 hover:shadow-3xl transition-all duration-300 dark:bg-gray-800/80 dark:border-gray-700/50">
                
                {/* Card Header */}
                <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
                      {title}
                    </h3>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <CardContent className="p-3 sm:p-6">
                  {data.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Chart Container - Responsive sizing */}
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={260} className="sm:hidden">
                          <PieChart>
                            <Pie 
                              data={data} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius={85}
                              innerRadius={25}
                              className="drop-shadow-lg"
                            >
                              {data.map((_, index) => (
                                <Cell 
                                  key={index} 
                                  fill={COLORS[index % COLORS.length]}
                                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(229, 231, 235, 0.5)',
                                borderRadius: '12px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                fontSize: '14px'
                              }}
                              formatter={(value, name) => {
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${value}g (${percentage}%)`, name];
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Desktop Chart */}
                        <ResponsiveContainer width="100%" height={320} className="hidden sm:block">
                          <PieChart>
                            <Pie 
                              data={data} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              outerRadius={110}
                              innerRadius={35}
                              className="drop-shadow-lg"
                            >
                              {data.map((_, index) => (
                                <Cell 
                                  key={index} 
                                  fill={COLORS[index % COLORS.length]}
                                  className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(229, 231, 235, 0.5)',
                                borderRadius: '12px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                              }}
                              formatter={(value, name) => {
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return [`${value}g (${percentage}%)`, name];
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Enhanced Legend with Percentages */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 sm:mt-4">
                        {data.map((item, index) => {
                          const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                          return (
                            <div key={index} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors duration-200 cursor-pointer group">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <button 
                                  className="w-3 h-3 rounded-full shadow-sm flex-shrink-0 hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Show tooltip or alert with percentage
                                    const tooltipText = `${item.name}: ${item.value}g (${percentage}%)`;
                                    
                                    // Create temporary tooltip
                                    const tooltip = document.createElement('div');
                                    tooltip.className = 'fixed z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg pointer-events-none';
                                    tooltip.textContent = tooltipText;
                                    tooltip.style.left = e.clientX + 'px';
                                    tooltip.style.top = (e.clientY - 40) + 'px';
                                    document.body.appendChild(tooltip);
                                    
                                    // Remove tooltip after 2 seconds
                                    setTimeout(() => {
                                      if (document.body.contains(tooltip)) {
                                        document.body.removeChild(tooltip);
                                      }
                                    }, 2000);
                                  }}
                                  title={`${item.name}: ${item.value}g (${percentage}%)`}
                                ></button>
                                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                  {item.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                                  {item.value}g
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors duration-200">
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-center font-medium text-sm sm:text-base">
                        No data available
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 text-center px-4">
                        Data will appear here once categories are added
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

    </div>
  </div>
);
}
