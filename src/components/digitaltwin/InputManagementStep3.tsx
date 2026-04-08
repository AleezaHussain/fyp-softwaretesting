import DigitalTwin3D from "./DigitalTwin3D";

// Receives config as a prop from InputManagement review step
export default function InputManagementStep3({ config }: { config: any }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: 400, padding: 24, background: "#f8fafc" }}>
        <h2>Data Center Config</h2>
        <pre>{JSON.stringify(config, null, 2)}</pre>
      </div>
      <div style={{ flex: 1 }}>
        <DigitalTwin3D config={config} />
      </div>
    </div>
  );
}
