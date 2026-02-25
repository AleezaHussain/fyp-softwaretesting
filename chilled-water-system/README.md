# Chilled Water System

This directory will contain modules and simulations for chilled-water systems.

Subfolders:
Module layout (Maven-style):

Subfolders:
- `crac` — CRAC-related code and simulations (src/main/java/com/acme/chilledwatersystem/crac)
- `crah` — CRAH-related code and simulations (src/main/java/com/acme/chilledwatersystem/crah)

Build and run (from this folder):

```powershell
# package
mvn package

# run placeholder CRAC app
java -cp target/chilled-water-ssytem-0.1.0-SNAPSHOT.jar com.acme.chilledwatersystem.crac.App
```

Place Java source files under appropriate package folders (e.g., `src/main/java/...`) when ready.
