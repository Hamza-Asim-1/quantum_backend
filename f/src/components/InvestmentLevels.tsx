const investmentData = [
  {
    level: 1,
    title: "Starter Plan",
    stakeRange: "100~1000",
    income: "0.3%",
  },
  {
    level: 2,
    title: "Growth Plan",
    stakeRange: "1001~3000",
    income: "0.4%",
  },
  {
    level: 3,
    title: "Professional Plan",
    stakeRange: "3001~6000",
    income: "0.5%",
  },
  {
    level: 4,
    title: "Premium Plan",
    stakeRange: "6001~10000",
    income: "0.6%",
  },
  {
    level: 5,
    title: "Elite Plan",
    stakeRange: "10001+",
    income: "0.7%",
  },
];

const InvestmentLevels = () => {
  return (
    <section id="plans" className="py-16 px-4" style={{ backgroundColor: '#f5f7fa' }}>
      <div className="max-w-[1400px] mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-foreground">Investment Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {investmentData.map((plan) => (
            <div
              key={plan.level}
              className="relative bg-white rounded-2xl p-6 pt-4 min-h-[280px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 transition-all duration-200 w-full max-w-[240px] mx-auto"
            >
              {/* Level Tag */}
              <div
                className="absolute -top-0 left-2 text-sm font-bold tracking-wider"
                style={{ color: '#374151' }}
              >
                LEVEL {plan.level}
              </div>

              {/* Plan Title */}
              <h3
                className="text-lg font-bold text-center mt-3 mb-4"
                style={{ color: '#1a1a2e' }}
              >
                {plan.title}
              </h3>

              {/* Info Section - REDUCED SPACING HERE */}
              <div className="space-y-1.5 mb-4">
                {/* Status Row */}
                <div className="flex items-center justify-between text-[13px] py-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className="px-3 py-1 rounded-md text-white text-xs font-semibold"
                    style={{
                      background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                    }}
                  >
                    Open
                  </span>
                </div>

                {/* StakeAmount Row */}
                <div className="flex items-center justify-between text-[13px] py-1">
                  <span className="text-muted-foreground">StakeAmount:</span>
                  <div className="flex items-center gap-1.5 font-semibold" style={{ color: '#333' }}>
                    <img
                      src="https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/usdt.svg"
                      alt="USDT"
                      className="w-4 h-4"
                    />
                    <span>{plan.stakeRange}</span>
                  </div>
                </div>

                {/* Income Row */}
                <div className="flex items-center justify-between text-[13px] py-1">
                  <span className="text-muted-foreground">Income:</span>
                  <span className="text-base font-bold" style={{ color: '#1a1a2e' }}>
                    {plan.income}
                  </span>
                </div>
              </div>

              {/* Buy Button */}
              <button
                className="w-full py-3 top-1 text-white text-sm font-semibold rounded-[10px] border-none cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: '#573CDD',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(90deg, #60a5fa 0%, #22d3ee 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 211, 238, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#573CDD';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InvestmentLevels;