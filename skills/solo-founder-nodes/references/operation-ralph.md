# Operation RALPH

Operation RALPH proves that an edit/action workflow works in the live product. A 3D object can be
coherent and still fail the user's actual job if brush select, delete, replace material, move window,
explode assembly, add hotspot, or export does not work.

Stages:

- R: define what the operation means in the selected domain.
- A: define the expected post-condition.
- L: build the UI/tool/action.
- P: run it in the browser with before/after proof.
- H: add regression fixtures for reported failures.

Example construction operation:

```json
{
  "operationId": "construction.replace-wall-material",
  "input": {
    "selectedRegion": "wall_02",
    "fromMaterial": "brick",
    "toMaterial": "wood"
  },
  "expected": {
    "onlySelectedWallChanged": true,
    "windowsPreserved": true,
    "dimensionsPreserved": true,
    "exportReopens": true
  },
  "proof": {
    "beforeScreenshot": "before.png",
    "afterScreenshot": "after.png",
    "diffReceipt": "material-diff.json"
  },
  "verdict": "pass"
}
```

Run:

```bash
npm run sfn -- operation init --goal "<goal>" --domain construction-mockups --project .
npm run sfn -- operation verify --project .
```

Rule: **Object proof is not workflow proof. No operation proof, no workflow claim.**
