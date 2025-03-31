export const nameToJapaneseName = (name: string) => {
    switch (name) {
        case 'soil_moisture':
        case 'moisture':
        case 'Moisture':
        case 'soil_humidity':
            return '体積含水率';
        case 'humidity':
        case 'Humidity':
            return '湿度';
        case 'dew_point':
        case 'dew_pointC':
        case 'dewPointC':
            return '露点';
        case 'Temperature':
        case 'temperature':
        case 'temperatureC':
        case 'soil_temperatureC':
        case 'temperature_c':
        case 'soil_temperature':
        case 'Soil Temperature':
            return '温度';
        case 'Temperature and Moisture':
            return '土壌温度/体積含水率';
        case 'Temperature and Humidity':
        case 'temperature and humidity':
        case 'temperature_and_humidity':
        case 'Temperature & Humidity':
        case 'temperature & humidity':
            return '温度/湿度';
        case 'soil_EC':
        case 'soil_ec':
            return '土壌電気伝導率';
        case 'soil_N':
        case 'soil_P':
        case 'soil_K':
        case 'soil_n':
        case 'soil_p':
        case 'soil_k':
            return '土壌養分';
        case 'soil_PH':
        case 'soil_ph':
            return '土壌pH';
        case 'co2_level':
            return 'CO2濃度';
        case 'vpd':
            return '飽和水蒸気圧差';
        case 'rainfall':
            return '降雨量';
        case 'pressure':
            return '気圧';
        case 'created_at':
            return '最終更新';
        case 'wind_speed':
            return '風速';
        case 'lux':
            return '照度';
        case 'uv':
            return '紫外線';
        case 'wind_direction':
            return '風向';
        case 'water_level':
            return '水位';
        case 'battery_level':
        case 'battery':
        case 'Battery':
            return '電池残量';
        case 'sos':
            return '緊急信号';
        case 'fire':
            return '火災';
        case 'people_count':
            return '人数';
        case 'car_count':
            return '車両数';
        case 'bicycle_count':
            return '自転車数';
        case 'Data Date Range':
        case 'data_date_range':
            return 'データ日付範囲';
        case 'Close':
        case 'close':
            return '閉じる';
        case 'Open':
        case 'open':
            return '開く';
        case 'Search':
        case 'search':
            return '検索';
        case 'Load Selected Data':
        case 'load_selected_data':
        case 'Load Selected Range':
        case 'load_selected_range':
            return '選択したデータを読み込む';
        case 'Download CSV':
        case 'download_csv':
            return 'CSVをダウンロード';
        case 'Download Excel':
        case 'download_excel':
            return 'Excelをダウンロード';
        case 'Download PDF':
        case 'download_pdf':
            return 'PDFをダウンロード';
        case 'CSV Download':
            return 'CSVダウンロード';
        case 'Report Download':
            return 'レポートダウンロード';
        case 'Report':
        case 'report':
        case 'Reports':
            return 'レポート';
        case 'Settings':
        case 'settings':
            return '設定';
        case 'Back':
        case 'back':
            return '戻る';
        case 'Last Seen':
        case 'Last seen':
        case 'last seen':
            return '最終接続';
        case 'Counts':
        case 'counts':
            return 'カウント';
        case 'ago':
            return '前';
        case 'Dashboard':
        case 'dashboard':
            return 'ダッシュボード';
        case 'Login':
        case 'login':
            return 'ログイン';
        case 'Logout':
        case 'logout':
            return 'ログアウト';
        case 'Register':
        case 'register':
            return '登録';
        case 'Forgot Password':
        case 'forgot_password':
            return 'パスワードを忘れた';
        case 'Reset Password':
        case 'reset_password':
            return 'パスワードをリセット';
        case 'Email':
        case 'email':
            return 'メール';
        case 'Password':
        case 'password':
            return 'パスワード';
        case 'Confirm Password':
        case 'confirm_password':
            return 'パスワードを確認';
        case 'Name':
        case 'name':
            return '名前';
        case 'Remember Me':
        case 'remember_me':
            return '私を覚えてますか';
        case 'All Locations':
        case 'all_locations':
            return 'すべての場所';
        case 'Help':
        case 'help':
            return 'ヘルプ';
        case 'Refresh':
        case 'refresh':
            return 'リフレッシュ';
        case 'Dashboard Style':
            return 'ダッシュボードスタイル';
        case 'Hide/Show Empty':
            return '空を隠す/表示する';
        case '1d':
            return '1日';
        case '2d':
            return '2日';
        case '3d':
            return '3日';
        case '1w':
            return '1週間';
        case '2w':
            return '2週間';
        case '3w':
            return '3週間';
        case '1m':
            return '1ヶ月';
        case '2m':
            return '2ヶ月';
        case 'Device Permissions':
            return 'デバイスの権限';
        case 'Administrator':
            return '管理者';
        case 'User':
            return 'ユーザー';
        case 'Guest':
            return 'ゲスト';
        case 'View':
            return '表示';
        case 'Disabled':
            return '無効';
        case 'Device Rules':
            return 'デバイスのルール';
        case 'Rule':
            return 'ルール';
        case 'Rule Name':
            return 'ルール名';
        case 'CO²':
        case 'co2':
            return 'CO²';
        case 'EC':
        case 'ec':
            return 'EC';
        case 'ph':
        case 'PH':
            return 'pH';
        case 'All Devices':
            return 'すべてのデバイス';
        default:
            return '';
    }
}
