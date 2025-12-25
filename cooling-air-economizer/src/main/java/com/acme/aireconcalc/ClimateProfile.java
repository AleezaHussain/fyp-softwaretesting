package com.acme.aireconcalc;

/**
 * Just a lightweight label holder so you can print which climate assumptions
 * you used (hot-humid, cold-dry, temperate). Adjust the hours/thresholds in EconomizerInputs accordingly.
 */
public class ClimateProfile {
    public enum Type { HOT_HUMID, COLD_DRY, TEMPERATE, CUSTOM }
    public final Type type;
    public final String notes;

    public ClimateProfile(Type type, String notes) {
        this.type = type;
        this.notes = notes;
    }
}
