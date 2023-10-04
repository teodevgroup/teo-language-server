"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUri = void 0;
const sanitizeUri = (uri) => {
    return uri.replace('file://', '');
};
exports.sanitizeUri = sanitizeUri;
//# sourceMappingURL=index.js.map