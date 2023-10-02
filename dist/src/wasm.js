"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTextDocument = void 0;
const teo_language_server_wasm_1 = require("teo-language-server-wasm");
const vscode_languageserver_1 = require("vscode-languageserver");
function validateTextDocument(document, documents) {
    const unsavedFiles = {};
    documents.map((document) => {
        unsavedFiles[document.uri.replace('file://', '')] = document.getText();
    });
    const sanitizedUri = document.uri.replace('file://', '');
    const linterStringResult = (0, teo_language_server_wasm_1.lint)(sanitizedUri, unsavedFiles);
    const linterResult = JSON.parse(linterStringResult);
    return linterResult.filter((result) => {
        return result.source == sanitizedUri;
    }).map((result) => {
        return vscode_languageserver_1.Diagnostic.create(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(result.span.start_position[0] - 1, result.span.start_position[1] - 1), vscode_languageserver_1.Position.create(result.span.end_position[0] - 1, result.span.end_position[1] - 1)), result.message, result.type == "error" ? vscode_languageserver_1.DiagnosticSeverity.Error : vscode_languageserver_1.DiagnosticSeverity.Warning);
    });
}
exports.validateTextDocument = validateTextDocument;
//# sourceMappingURL=wasm.js.map