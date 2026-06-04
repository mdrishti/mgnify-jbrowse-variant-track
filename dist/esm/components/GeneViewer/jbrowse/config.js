export function buildAssemblyConfig(props) {
    const { assembly } = props;
    return {
        name: assembly.name,
        sequence: {
            type: 'ReferenceSequenceTrack',
            trackId: 'ReferenceSequenceTrack',
            adapter: {
                type: 'BgzipFastaAdapter',
                fastaLocation: { uri: assembly.fasta.fastaUrl },
                faiLocation: { uri: assembly.fasta.faiUrl },
                gziLocation: { uri: assembly.fasta.gziUrl },
            },
        },
    };
}
export function buildTracksConfig(props, opts) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { assembly, annotation, essentiality } = props;
    const gff = annotation.gff;
    const adapterMode = (_b = (_a = opts === null || opts === void 0 ? void 0 : opts.adapterMode) !== null && _a !== void 0 ? _a : gff.gffAdapterMode) !== null && _b !== void 0 ? _b : 'auto';
    const usePlainAdapter = adapterMode === 'plain';
    const labelFields = [
        'Name',
        'gene',
        'locus_tag',
        'ID',
    ];
    const labelJexl = labelFields.map((f) => `get(feature,'${f}')`).join(" || ");
    const showEssentiality = !!(essentiality === null || essentiality === void 0 ? void 0 : essentiality.enabled);
    const labelWithEss = showEssentiality
        ? `${labelJexl} + ' ' + getEssentialityIcon(feature)`
        : labelJexl;
    const essentialityFields = {
        essentialityCsvUrl: showEssentiality && (essentiality === null || essentiality === void 0 ? void 0 : essentiality.csvUrl) ? essentiality.csvUrl : '',
        csvJoinColumn: (_c = essentiality === null || essentiality === void 0 ? void 0 : essentiality.csvJoinColumn) !== null && _c !== void 0 ? _c : 'locus_tag',
        csvStatusColumn: (_d = essentiality === null || essentiality === void 0 ? void 0 : essentiality.csvStatusColumn) !== null && _d !== void 0 ? _d : 'essentiality',
        featureJoinAttribute: (_e = essentiality === null || essentiality === void 0 ? void 0 : essentiality.featureJoinAttribute) !== null && _e !== void 0 ? _e : 'locus_tag',
    };
    const adapterConfig = usePlainAdapter
        ? {
            type: 'Gff3WithEssentialityAdapter',
            gffLocation: { uri: gff.gffUrl },
            ...essentialityFields,
        }
        : {
            type: 'Gff3TabixWithEssentialityAdapter',
            gffGzLocation: { uri: gff.gffUrl },
            index: {
                indexType: 'CSI',
                location: { uri: gff.csiUrl },
            },
            ...essentialityFields,
        };
    const tracks = [];
    if (((_f = props.variants) === null || _f === void 0 ? void 0 : _f.vcfUrl) && ((_g = props.variants) === null || _g === void 0 ? void 0 : _g.tbiUrl)) {
        tracks.push({
            type: 'VariantTrack',
            trackId: 'variants',
            name: (_h = props.variants.name) !== null && _h !== void 0 ? _h : 'Variants',
            assemblyNames: [assembly.name],
            category: ['Variants'],
            adapter: {
                type: 'VcfTabixAdapter',
                vcfGzLocation: { uri: props.variants.vcfUrl },
                index: {
                    indexType: 'TBI',
                    location: { uri: props.variants.tbiUrl },
                },
            },
            displays: [
                {
                    displayId: 'variants-LinearVariantDisplay',
                    type: 'LinearVariantDisplay',
                    height: 140,
                    maxFeatureScreenDensity: 0.01,
                },
            ],
            visible: true,
        });
    }
    tracks.push({
        type: 'FeatureTrack',
        trackId: 'gene_features',
        name: (_j = annotation.name) !== null && _j !== void 0 ? _j : 'Genes',
        assemblyNames: [assembly.name],
        category: ['Annotations'],
        adapter: adapterConfig,
        ...(gff.ixUrl && gff.ixxUrl
            ? {
                textSearching: {
                    textSearchAdapter: {
                        type: 'TrixTextSearchAdapter',
                        textSearchAdapterId: 'gff-trix',
                        trackId: 'gene_features',
                        ixFilePath: { uri: gff.ixUrl },
                        ixxFilePath: { uri: gff.ixxUrl },
                        ...(gff.metaUrl ? { metaFilePath: { uri: gff.metaUrl } } : {}),
                        assemblyNames: [assembly.name],
                    },
                },
            }
            : {}),
        displays: [
            {
                displayId: 'gene_features-LinearBasicDisplay',
                id: 'gene_features-LinearBasicDisplay',
                type: 'LinearBasicDisplay',
                height: 280,
                // Let JBrowse handle clicks -> session.setSelection(feature); we sync via poll
                renderer: {
                    type: 'SvgFeatureRenderer',
                    // METT-style: jexl:getGeneColor(feature) for highlight + essentiality
                    color1: 'jexl:getGeneColor(feature)',
                    color2: 'jexl:getGeneColor(feature)',
                    labels: {
                        name: 'jexl:' + labelWithEss,
                    },
                },
            },
        ],
        visible: true,
    });
    return tracks;
}
export function buildDefaultSessionConfig(opts) {
    var _a, _b, _c, _d;
    const start = (_a = opts.initialStart) !== null && _a !== void 0 ? _a : 0;
    const end = Math.max(start + 1, opts.initialEnd);
    const geneTrack = opts.geneTrackConfig;
    const variantTrack = opts.variantTrackConfig;
    const sessionTracks = [
        {
            type: 'ReferenceSequenceTrack',
            configuration: 'ReferenceSequenceTrack',
            minimized: false,
            displays: [
                {
                    id: 'ReferenceSequenceTrack',
                    type: 'LinearReferenceSequenceDisplay',
                    height: 200,
                    showForward: true,
                    showReverse: true,
                    showTranslation: true,
                    showLabels: true,
                },
            ],
        },
    ];
    if (variantTrack) {
        sessionTracks.push({
            id: variantTrack.trackId,
            type: 'VariantTrack',
            configuration: variantTrack.trackId,
            minimized: false,
            visible: true,
            displays: variantTrack.displays,
        });
    }
    sessionTracks.push({
        id: (_b = geneTrack === null || geneTrack === void 0 ? void 0 : geneTrack.trackId) !== null && _b !== void 0 ? _b : 'gene_features',
        type: 'FeatureTrack',
        configuration: (_c = geneTrack === null || geneTrack === void 0 ? void 0 : geneTrack.trackId) !== null && _c !== void 0 ? _c : 'gene_features',
        minimized: false,
        visible: true,
        displays: (_d = geneTrack === null || geneTrack === void 0 ? void 0 : geneTrack.displays) !== null && _d !== void 0 ? _d : [
            {
                displayId: 'gene_features-LinearBasicDisplay',
                id: 'gene_features-LinearBasicDisplay',
                type: 'LinearBasicDisplay',
                height: 280,
                renderer: {
                    type: 'SvgFeatureRenderer',
                    color1: 'jexl:getGeneColor(feature)',
                    color2: 'jexl:getGeneColor(feature)',
                },
            },
        ],
    });
    return {
        name: 'Gene Viewer session',
        widgets: {
            BaseFeatureWidget: { type: 'BaseFeatureWidget', disabled: true },
        },
        views: [
            {
                type: 'LinearGenomeView',
                configuration: {
                    header: { disable: true, hidden: true },
                    // Let JBrowse set session.selection on click; we sync to panel/table via poll
                },
                displayedRegions: [
                    {
                        refName: opts.initialRefName,
                        start,
                        end,
                        assemblyName: opts.assemblyName,
                    },
                ],
                tracks: sessionTracks,
            },
        ],
    };
}
