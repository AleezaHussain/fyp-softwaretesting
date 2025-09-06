import org.cloudbus.cloudsim.core.CloudSim;

public class CloudSimTest {
    public static void main(String[] args) {
        CloudSim.init(1, null, false);
        System.out.println("CloudSim initialized successfully!");
    }
}