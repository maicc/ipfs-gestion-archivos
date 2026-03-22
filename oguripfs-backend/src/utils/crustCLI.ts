import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const getOrderStateCLI = async (cid: string): Promise<{ reported_replica_count: number, expired_at: number }> => {
  try {
    const { stdout } = await execAsync(`crust-cli status ${cid}`);
    
    const replicaMatch = stdout.match(/replicas:\s*(\d+)/);
    const replicaCount = replicaMatch ? parseInt(replicaMatch[1]!) : 0;

    // crust-cli no devuelve expired_at, así que usamos la API para eso
    return {
      reported_replica_count: replicaCount,
      expired_at: 0,
    };
  } catch (error) {
    console.error(`Error ejecutando crust-cli para ${cid}:`, error);
    return { reported_replica_count: 0, expired_at: 0 };
  }
};