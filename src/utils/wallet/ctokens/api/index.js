export var CtokensAppSortDirection;
(function (CtokensAppSortDirection) {
    CtokensAppSortDirection["Asc"] = "asc";
    CtokensAppSortDirection["Desc"] = "desc";
})(CtokensAppSortDirection || (CtokensAppSortDirection = {}));
export var CtokensAppAssetType;
(function (CtokensAppAssetType) {
    CtokensAppAssetType["All"] = "all";
    CtokensAppAssetType["Token"] = "token";
    CtokensAppAssetType["Nft"] = "nft";
})(CtokensAppAssetType || (CtokensAppAssetType = {}));
export var CtokensAppMetadataType;
(function (CtokensAppMetadataType) {
    CtokensAppMetadataType["Nft"] = "nft";
    CtokensAppMetadataType["Token"] = "token";
    CtokensAppMetadataType["User"] = "user";
})(CtokensAppMetadataType || (CtokensAppMetadataType = {}));
export default {
    ctokensApi: {
        urlPath: "ctokens-api",
        broadcastProxy: {
            urlPath: "broadcast-proxy",
            method: "POST"
        },
        paymentPlans: {
            urlPath: "payment-plans",
            method: "GET"
        },
        version: {
            urlPath: "version",
            method: "GET"
        },
        lastSyncedBlock: {
            urlPath: "last-synced-block",
            method: "GET"
        },
        topHolders: {
            urlPath: "top-holders",
            method: "GET"
        },
        balances: {
            urlPath: "balances",
            method: "GET"
        },
        nft: {
            urlPath: "nft",
            method: "GET"
        },
        nfts: {
            urlPath: "nfts",
            method: "GET"
        },
        balanceHistory: {
            urlPath: "balance-history",
            method: "GET"
        },
        nftHistory: {
            urlPath: "nft-history",
            method: "GET"
        },
        tokens: {
            urlPath: "tokens",
            method: "GET"
        },
        users: {
            urlPath: "users",
            method: "GET"
        },
        status: {
            urlPath: "status",
            method: "GET"
        },
        metadata: {
            urlPath: "metadata",
            metadataType: {
                urlPath: "{metadataType}",
                method: "GET"
            }
        }
    }
};
