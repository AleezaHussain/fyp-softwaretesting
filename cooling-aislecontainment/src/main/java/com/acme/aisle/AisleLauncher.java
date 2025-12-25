package com.acme.aisle;

import java.io.*;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;

public class AisleLauncher {
    public static void main(String[] args) throws Exception {
        String runner = System.getProperty("aisle.runner", "python");
        if ("java".equalsIgnoreCase(runner)) {
            HotColdAisleSimulation.main(args);
            return;
        }
        runPythonSim();
    }

    private static void runPythonSim() throws Exception {
        Path moduleDir = Paths.get("").toAbsolutePath();
        // Attempt to locate project root by looking for parent containing "simulations" folder
        Path root = moduleDir;
        for (int i = 0; i < 5; i++) {
            if (Files.exists(root.resolve("simulations"))) break;
            root = root.getParent();
        }
        Path script = root.resolve("simulations").resolve("hot_cold_aisle").resolve("hot_cold_aisle_sim.py");
        if (!Files.exists(script)) {
            throw new FileNotFoundException("Could not find Python script: " + script);
        }

        List<String> cmd = new ArrayList<>();
        // Prefer 'python' then fallback to 'py -3'
        if (isOnPath("python")) {
            cmd.add("python");
        } else if (isOnPath("py")) {
            cmd.add("py"); cmd.add("-3");
        } else {
            throw new IllegalStateException("Neither 'python' nor 'py' was found on PATH. Install Python 3.");
        }
        cmd.add(script.toString());

        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(root.toFile());
        pb.redirectErrorStream(true);
        Process p = pb.start();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            String line;
            while ((line = br.readLine()) != null) {
                System.out.println(line);
            }
        }
        int code = p.waitFor();
        if (code != 0) {
            throw new RuntimeException("Python simulation exited with code " + code);
        }
    }

    private static boolean isOnPath(String exe) {
        String path = System.getenv("PATH");
        if (path == null) return false;
        String[] parts = path.split(File.pathSeparator);
        for (String dir : parts) {
            Path p = Paths.get(dir).resolve(exe + (isWindows() ? ".exe" : ""));
            if (Files.exists(p)) return true;
        }
        return false;
    }

    private static boolean isWindows() {
        String os = System.getProperty("os.name", "").toLowerCase();
        return os.contains("win");
    }
}
