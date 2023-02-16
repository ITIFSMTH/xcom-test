/* Used packages: 
    https://www.npmjs.com/package/adm-zip
    https://www.npmjs.com/package/node-fetch
*/
import admZip from "adm-zip";
import fetch from "node-fetch";
import { XMLParser } from "fast-xml-parser";

// URI to zip file with bics
const ZIP_URI = "http://www.cbr.ru/s/newbik";
const PARSE_LOCALE = "utf8";


/* Returns bic's list */
const FetchBIC = async () => {
    // Fetch zip archive
    const res = await fetch(ZIP_URI);
    console.log(res.ok)
    if (!res.ok) return new Error("Unexpected error on fetching zip");

    // Convert stream to buffer
    const resChunks = [];
    try {
        for await (const chunk of res.body) {
            resChunks.push(chunk);
        }
    } catch (err) {
        return new Error("Unexpected error on parsing zip");
    }

    // Declare array for return
    const bics = [];

    // Create XML Parser
    const parser = new XMLParser({
        ignoreAttributes: false,
        ignoreDeclaration: true,
        attributeNamePrefix: '@_',
    });

    // For each file
    const zip = new admZip(Buffer.concat(resChunks));
    zip.forEach((zipEntry) => {
        // Get XML as string
        const xml = zipEntry.getData().toString(PARSE_LOCALE);
        // Parse XML
        const xmlObj = parser.parse(xml);
        
        // For each BICDirectoryEntry
        for (const data of xmlObj[zipEntry.entryName.split('_')[1]]['BICDirectoryEntry']) {
            // Get BIC
            const bic = data['@_BIC'];
            // Get name
            const name = data['ParticipantInfo']['@_NameP'];

            // If accounts is array
            if (Array.isArray(data['Accounts'])) {
                // For each account
                for (const account of data['Accounts']) {
                    bics.push({
                        bic: bic,
                        name: name,
                        corrAccount: account['@_Account']
                    })
                }
            } else if (data['Accounts']) {
                bics.push({
                    bic: bic,
                    name: name,
                    corrAccount: data['Accounts']['@_Account']
                })
            }
        }
    })

    return bics
}

export default FetchBIC 