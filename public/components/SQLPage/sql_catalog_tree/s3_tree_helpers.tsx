/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import _ from 'lodash';
import React from 'react';
import {
  TREE_ITEM_COVERING_INDEX_DEFAULT_NAME,
  TREE_ITEM_DATABASE_NAME_DEFAULT_NAME,
  TREE_ITEM_MATERIALIZED_VIEW_DEFAULT_NAME,
  TREE_ITEM_SKIPPING_INDEX_DEFAULT_NAME,
  TREE_ITEM_TABLE_NAME_DEFAULT_NAME,
} from '../../../../common/constants';
import { CachedDataSourceStatus, TreeItem, TreeItemType } from '../../../../common/types';
import { useToast } from '../../../../common/utils/toast_helper';
import { catalogCacheRefs } from '../../../framework/catalog_cache_refs';

let pageStateLanguage: string;
export const handleQuery = (
  e: React.MouseEvent<SVGElement, MouseEvent>,
  dataSource: string,
  database: string,
  tableName: string,
  updateSQLQueries: (query: string) => void
) => {
  e.stopPropagation();
  updateSQLQueries(`select * from \`${dataSource}\`.\`${database}\`.\`${tableName}\` limit 10`);
};

export const pageLanguage = (language: string) => {
  pageStateLanguage = language;
};

export const handlePPLQuery = (
  e: React.MouseEvent<SVGElement, MouseEvent>,
  dataSource: string,
  database: string,
  tableName: string,
  updatePPLQueries: (query: string) => void
) => {
  e.stopPropagation();
  updatePPLQueries(`source = ${dataSource}.${database}.${tableName} | head 10`);
};

export const createLabel = (
  node: TreeItem,
  dataSource: string,
  database: string,
  index: number,
  updateSQLQueries: (query: string) => void,
  updatePPLQueries: (query: string) => void
) => {
  return (
    <div key={node.name}>
      <EuiToolTip position="right" content={node.name} delay="long">
        <EuiFlexGroup direction="row">
          <EuiFlexItem grow={false}>
            <EuiText>
              {_.truncate(node.name, { length: 50 })}{' '}
              {node.isLoading && <EuiLoadingSpinner size="m" />}
              {node.type === TREE_ITEM_TABLE_NAME_DEFAULT_NAME && !node.isLoading && (
                <EuiIcon
                  type="editorCodeBlock"
                  onClick={(e) => {
                    if (pageStateLanguage === 'SQL') {
                      handleQuery(e, dataSource, database, node.name, updateSQLQueries);
                    } else {
                      handlePPLQuery(e, dataSource, database, node.name, updatePPLQueries);
                    }
                  }}
                />
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    </div>
  );
};

export const iconCreation = (node: TreeItem) => {
  switch (node.type) {
    case TREE_ITEM_MATERIALIZED_VIEW_DEFAULT_NAME:
      return (
        <EuiNotificationBadge aria-label="Materialized view" color="subdued">
          MV
        </EuiNotificationBadge>
      );
    case TREE_ITEM_TABLE_NAME_DEFAULT_NAME:
      return <EuiIcon type="tableDensityCompact" size="s" />;
    case TREE_ITEM_DATABASE_NAME_DEFAULT_NAME:
      return <EuiIcon type="database" size="m" />;
    case TREE_ITEM_COVERING_INDEX_DEFAULT_NAME:
    case TREE_ITEM_SKIPPING_INDEX_DEFAULT_NAME:
      return <EuiIcon type="bolt" size="m" />;
    default:
      return null; // Return null for unknown node types
  }
};

export const loadTreeItem = (elements: string[], type: TreeItemType, values?: any): TreeItem[] => {
  return elements.map((element) => {
    const treeItem: TreeItem = {
      name: element,
      type,
      isExpanded: false,
    };

    if (
      type !== TREE_ITEM_COVERING_INDEX_DEFAULT_NAME &&
      type !== TREE_ITEM_SKIPPING_INDEX_DEFAULT_NAME
    ) {
      if (values !== undefined) treeItem.values = values;
      else treeItem.values = [];
      treeItem.isLoading = false;
    }
    return treeItem;
  });
};

export const isEitherObjectCacheEmpty = (
  dataSourceName: string,
  databaseName: string,
  dataSourceMDSId?: string
) => {
  try {
    const dbCache = catalogCacheRefs.CatalogCacheManager!.getDatabase(
      dataSourceName,
      databaseName,
      dataSourceMDSId
    );
    const dsCache = catalogCacheRefs.CatalogCacheManager!.getOrCreateAccelerationsByDataSource(
      dataSourceName,
      dataSourceMDSId
    );
    return (
      dbCache.status === CachedDataSourceStatus.Empty ||
      dsCache.status === CachedDataSourceStatus.Empty ||
      dbCache.status === CachedDataSourceStatus.Failed ||
      dsCache.status === CachedDataSourceStatus.Failed
    );
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const getTablesFromCache = (
  dataSourceName: string,
  databaseName: string,
  dataSourceMDSId?: string
) => {
  const { setToast } = useToast();
  try {
    const dbCache = catalogCacheRefs.CatalogCacheManager!.getDatabase(
      dataSourceName,
      databaseName,
      dataSourceMDSId
    );
    if (dbCache.status === CachedDataSourceStatus.Updated) {
      const tables = dbCache.tables.map((tb) => tb.name);
      return tables;
    } else {
      return [];
    }
  } catch (error) {
    console.error(error);
    setToast('Your cache is outdated, refresh databases and tables', 'warning');
    return [];
  }
};

export const getAccelerationsFromCache = (dataSourceName: string, dataSourceMDSId?: string) => {
  const dsCache = catalogCacheRefs.CatalogCacheManager!.getOrCreateAccelerationsByDataSource(
    dataSourceName,
    dataSourceMDSId
  );

  if (dsCache.status === CachedDataSourceStatus.Updated && dsCache.accelerations.length > 0) {
    return dsCache.accelerations;
  } else {
    return [];
  }
};

export const findSkippingAndCoveringIndexNames = (data: any[], database: string, table: string) => {
  const filteredIndexes = _.filter(data, (obj) => {
    return (
      obj.database === database &&
      obj.table === table &&
      (obj.type === 'skipping' || obj.type === 'covering')
    );
  });

  return _.map(filteredIndexes, (obj) => {
    return obj.type === 'skipping' && obj.indexName === null
      ? TREE_ITEM_SKIPPING_INDEX_DEFAULT_NAME
      : obj.indexName;
  });
};

export const findMaterializedViewsForDatabase = (data: any[], database: string) => {
  const materializedViews = _.filter(data, (obj) => {
    return obj.database === database && obj.type === 'materialized';
  });

  return _.map(materializedViews, 'indexName');
};

export const findIndexObject = (
  data: any[],
  database: string,
  table: string | undefined,
  indexName: string
) => {
  return _.find(data, (obj) => {
    return (
      obj.database === database &&
      (!table || obj.table === table) &&
      (obj.indexName === indexName ||
        (indexName === 'skipping_index' && obj.type === 'skipping' && obj.indexName === null))
    );
  });
};
