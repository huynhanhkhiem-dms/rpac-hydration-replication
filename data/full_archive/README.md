# Full frozen supplement archive

The complete frozen data package used for the RPAC manuscript is stored here as four Base64 text parts so the binary ZIP can be reconstructed exactly from ordinary Git-tracked files.

## Reconstruct

```bash
cat RPAC_FULL_SUPPLEMENT_DATA.zip.part00.b64 \
    RPAC_FULL_SUPPLEMENT_DATA.zip.part01.b64 \
    RPAC_FULL_SUPPLEMENT_DATA.zip.part02.b64 \
    RPAC_FULL_SUPPLEMENT_DATA.zip.part03.b64 \
  | base64 -d > RPAC_FULL_SUPPLEMENT_DATA.zip

sha256sum RPAC_FULL_SUPPLEMENT_DATA.zip
unzip -t RPAC_FULL_SUPPLEMENT_DATA.zip
```

Expected SHA-256:

```text
48006b034fa2314792ad4e9fbef23d1f8792025cac50db6b8924bd486039b785  RPAC_FULL_SUPPLEMENT_DATA.zip
```

The reconstructed ZIP contains the raw browser captures, comparator outputs, exhaustive 8,192-contract frontier, temporal-holdout captures/results, timing-sensitivity captures/results, compact summaries, provenance records, environment metadata, and the supplement checksum manifest.

The archive is a frozen research artifact. Public upstream GitHub issues linked by the provenance files remain third-party materials and are not relicensed by this repository.
