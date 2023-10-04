import { Diagnostic, LocationLink, Position } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
export declare function removeCachedSchema(uri: string): void;
export declare function validateTextDocument(document: TextDocument, documents: TextDocument[]): Diagnostic[];
export declare function findDefinitionsAtPosition(uri: string, documents: TextDocument[], position: Position): LocationLink[];
