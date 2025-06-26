import { View, StyleSheet } from 'react-native';
import Routing from './screens/Routing/routing';
import Toast from 'react-native-toast-message';

function App() {
  return (
    <View style={styles.container}>
      <Routing />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
