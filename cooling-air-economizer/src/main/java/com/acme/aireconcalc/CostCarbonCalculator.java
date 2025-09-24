package com.acme.aireconcalc;

/**
 * ROI / Payback calculator based on annualized savings.
 */
public class CostCarbonCalculator {

    public static ROIResult computeROI(AirEconomizerModel.Result res,
                                       EconomizerInputs in,
                                       double fractionOfYearSimulated) {
        // Normalize savings to annual basis
        double annualSavingsCost = (res.savings_cost / Math.max(fractionOfYearSimulated, 1e-6));
        double annualSavingsCO2  = (res.savings_co2_kg / Math.max(fractionOfYearSimulated, 1e-6));

        // Annual Net benefit ($)
        double annualNetBenefitUSD = annualSavingsCost - in.annualOpexMaintUSD;

        ROIResult r = new ROIResult();
        r.annualSavingsCostUSD = annualSavingsCost;
        r.annualSavingsCO2kg   = annualSavingsCO2;
        r.annualNetBenefitUSD  = annualNetBenefitUSD;

        if (in.capexEconomizerUSD > 0) {
            r.simplePaybackYears = in.capexEconomizerUSD / Math.max(annualNetBenefitUSD, 1e-9);
            r.netFirstYearCashflowUSD = annualNetBenefitUSD - in.capexEconomizerUSD; // if CAPEX counted in year 1
        } else {
            r.simplePaybackYears = Double.POSITIVE_INFINITY;
            r.netFirstYearCashflowUSD = annualNetBenefitUSD;
        }
        return r;
    }
}
