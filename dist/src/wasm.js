"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDiagnosticsRequest = void 0;
const teo_language_server_wasm_1 = require("teo-language-server-wasm");
const vscode_languageserver_1 = require("vscode-languageserver");
function handleDiagnosticsRequest(document) {
    console.log("see document uri: " + document.uri);
    const linterStringResult = (0, teo_language_server_wasm_1.lint)(document.uri);
    const linterResult = JSON.parse(linterStringResult);
    return linterResult.filter((result) => {
        return result.source == document.uri;
    }).map((result) => {
        return vscode_languageserver_1.Diagnostic.create(vscode_languageserver_1.Range.create(vscode_languageserver_1.Position.create(result.span.start_position[0], result.span.start_position[1]), vscode_languageserver_1.Position.create(result.span.end_position[0], result.span.end_position[1])), result.message);
    });
}
exports.handleDiagnosticsRequest = handleDiagnosticsRequest;
//# sourceMappingURL=wasm.js.map