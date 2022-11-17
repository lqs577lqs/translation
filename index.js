const Translation = require("./utils/translation");



const appKey = "";
const key = '';//注意：暴露appSecret，有被盗用造成损失的风险


const folders = [
    // 'OSPAlarmSystem',
    // 'OSPAlgorithmSystem',
    // 'OSPDatasetSystem',
    // 'OSPFaceSystem',
    // 'OSPGeneralSystem',
    // 'OSPGisSystem',
    // 'OSPliveAndPlayback',
    // 'OSPMain',
    // 'OSPMaintenanceSystem',
    'OSPVideoSystem'
]

const transIns = new Translation({
    appKey: appKey,
    key: key,
});

transIns.setFolders(folders).handleFiles();