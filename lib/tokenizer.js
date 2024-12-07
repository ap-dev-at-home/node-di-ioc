const CMD_NEXT                              = 1;
const CMD_BREAK                             = 2;

const SEPERATOR                             = ',';
const CLOSE_PARANTHESIS                     = ')';
const COMMENT_START                         = '//';
const COMMENT_END                           = '\n';
const MULTILINE_COMMENT_START               = '/*';
const MULTILINE_COMMENT_END                 = '*/';

const UNSUPPORTED_PARAMETER_NAMES_SYNTAX    = ['=', '...', '{', '}', '[', ']'];

module.exports.extractParameterNames = function(func) {
    if (typeof func !== 'function') {
        return { result: [], success: false, message: 'Not a function' };
    }

    const tokenizer = {
        string: func.toString(),
        inComment: false,
        inMultiLineComment: false,
        index: 0,
        parameter: [],
        current: ''
    };

    tokenizer.index = tokenizer.string.indexOf('(') + 1;

    while (tokenizer.index < tokenizer.string.length) {

        const unsupported = fastFailOnUnsupportedParameterNamesSyntax(tokenizer);
        if (unsupported !== undefined) {
            return { result: [], success: false, message: unsupported }
        }

        tokenizeSingleLineComments(tokenizer);
        
        tokenizeMultiLineComments(tokenizer);
        
        //seperator or close paranthesis
        const isSeparator = nextToken(
            !tokenizer.inMultiLineComment && !tokenizer.inComment,
            [SEPERATOR, CLOSE_PARANTHESIS],
            tokenizer.string,
            tokenizer.index,
            (i, t, l) => {
                const parameterName = tokenizer.current.trim();
                if (parameterName.length > 0) {
                    tokenizer.parameter.push(parameterName);
                }
                
                tokenizer.current = '';
                
                return t == SEPERATOR ? CMD_NEXT : CMD_BREAK;
            }
        );

        if (isSeparator === CMD_NEXT) {
            tokenizer.index++;
            continue;
        }
        else if (isSeparator === CMD_BREAK) {
            return { result: tokenizer.parameter, success: true, message: null };
        }

        var isParameterName = !tokenizer.inComment && !tokenizer.inMultiLineComment;
        if (isParameterName) {
            tokenizer.current += tokenizer.string[tokenizer.index];
        }

        tokenizer.index++;
    }

    return null;
}

function fastFailOnUnsupportedParameterNamesSyntax(tokenizer) {
    return nextToken(
        !tokenizer.inMultiLineComment && !tokenizer.inComment,
        UNSUPPORTED_PARAMETER_NAMES_SYNTAX,
        tokenizer.string,
        tokenizer.index,
        (i, t, l) => `Unsupported parameter names syntax ${t}`
    );
}

function tokenizeSingleLineComments(tokenizer) {
    nextToken( 
        !tokenizer.inMultiLineComment && !tokenizer.inComment,
        [COMMENT_START], 
        tokenizer.string, 
        tokenizer.index,
        (i, t, l) => { tokenizer.inComment = true; tokenizer.index += l; }
    );

    nextToken(
        !tokenizer.inMultiLineComment && tokenizer.inComment,
        [COMMENT_END],
        tokenizer.string,
        tokenizer.index,
        (i, t, l) => { tokenizer.inComment = false; tokenizer.index += l; }
    );
}

function tokenizeMultiLineComments(tokenizer) {
    nextToken( 
        !tokenizer.inMultiLineComment && !tokenizer.inComment,
        [MULTILINE_COMMENT_START], 
        tokenizer.string, 
        tokenizer.index,
        (i, t, l) => { tokenizer.inMultiLineComment = true; tokenizer.index += l; }
    );

    nextToken( 
        tokenizer.inMultiLineComment && !tokenizer.inComment,
        [MULTILINE_COMMENT_END], 
        tokenizer.string, 
        tokenizer.index,
        (i, t, l) => { tokenizer.inMultiLineComment = false; tokenizer.index += l; }
    );
}

function nextToken(isApplicable, tokenArray, str, index, callback) {
    if (isApplicable == false) {
        return;
    }

    for (var i = 0; i < tokenArray.length; i++) {
        const token = tokenArray[i];
        if (str.startsWith(token, index) == true) {
            const result = callback(index, token, token.length);
            if (result != undefined) {
                return result;
            }
        }
    }
}