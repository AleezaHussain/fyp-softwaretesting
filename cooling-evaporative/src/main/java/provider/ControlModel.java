package provider;

public class ControlModel {
    public double speed; // 0-1
    public double integral;
    public double Kp;
    public double Ki;
    public double speed_min;
    public double speed_max;
    public double Vdot_max;
    public double P_fan_max;

    public ControlModel(double Kp, double Ki, double speed_min, double speed_max, double Vdot_max, double P_fan_max) {
        this.Kp = Kp;
        this.Ki = Ki;
        this.speed_min = speed_min;
        this.speed_max = speed_max;
        this.Vdot_max = Vdot_max;
        this.P_fan_max = P_fan_max;
        this.speed = speed_min;
        this.integral = 0.0;
    }

    public void update(double error, double dt) {
        integral += error * dt;
        speed += Kp * error + Ki * integral;
        if (speed > speed_max)
            speed = speed_max;
        if (speed < speed_min)
            speed = speed_min;
    }

    public double getAirflow() {
        return Vdot_max * speed;
    }

    public double getFanPower() {
        return P_fan_max * Math.pow(speed, 3);
    }
}
